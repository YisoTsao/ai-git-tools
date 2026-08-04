/**
 * Commit 命令
 * 自動產生 commit message 並執行 commit
 */

import { execSync } from 'child_process';
import { loadCommitConfig } from '../core/config-loader.js';
import { GitOperations } from '../core/git-operations.js';
import { AIClient } from '../core/ai-client.js';
import { Logger } from '../utils/logger.js';
import {
  cleanCommitMessage,
  validateCommitMessage,
  isCopilotSubscriptionError,
} from '../utils/helpers.js';
import { generateCommitMessagePrompt } from '../ai/prompts/commit-message.js';

export async function commitCommand() {
  const logger = new Logger();

  // 載入配置
  const config = await loadCommitConfig();

  if (config.output.verbose) {
    console.log('📋 使用配置：');
    console.log(`   AI Model: ${config.ai.model}`);
    console.log(`   Max Diff Length: ${config.ai.maxDiffLength}`);
    console.log('');
  }

  // 檢查是否有 staged 變更
  const diff = GitOperations.getStagedDiff();

  if (!diff.trim()) {
    logger.error('沒有 staged 的變更');
    console.log('💡 請先使用 git add 來 stage 你的變更');
    throw new Error('沒有 staged 的變更');
  }

  logger.step('正在分析變更內容...\n');

  // 截斷過長的 diff
  const truncatedDiff =
    diff.length > config.ai.maxDiffLength
      ? diff.substring(0, config.ai.maxDiffLength) + '\n\n... [diff 過長已截斷]'
      : diff;

  if (config.output.verbose && diff.length > config.ai.maxDiffLength) {
    logger.warning(`Diff 已從 ${diff.length} 字元截斷至 ${config.ai.maxDiffLength} 字元\n`);
  }

  // 使用 AI 產生 commit message
  let commitMessage = '';
  let lastError = null;

  for (let attempt = 1; attempt <= config.ai.maxRetries; attempt++) {
    try {
      if (config.output.verbose && attempt > 1) {
        console.log(`🔄 重試第 ${attempt}/${config.ai.maxRetries} 次...\n`);
      }

      const prompt = generateCommitMessagePrompt(truncatedDiff, config);

      const response = await AIClient.sendAndWait(prompt, config.ai.model);
      commitMessage = cleanCommitMessage(response);

      // 驗證 commit message
      const validation = validateCommitMessage(commitMessage);
      if (!validation.valid) {
        throw new Error(`無效的 commit message: ${validation.reason}`);
      }

      // 成功產生，跳出重試迴圈
      break;
    } catch (error) {
      lastError = error;
      if (config.output.verbose) {
        logger.warning(`嘗試 ${attempt} 失敗: ${error.message}\n`);
      }

      if (attempt < config.ai.maxRetries) {
        continue;
      }
    }
  }

  // 所有重試都失敗
  if (!commitMessage) {
    logger.error('無法產生有效的 commit message');

    // 區分不同類型的錯誤
    if (isCopilotSubscriptionError(lastError)) {
      console.log('\n🔑 看起來是 GitHub Copilot 授權問題\n');
      console.log('解決方案:');
      console.log('  1. 確認你的 GitHub 帳號已訂閱 GitHub Copilot');
      console.log('  2. 驗證 VS Code 中使用的 GitHub 帳號是否有 Copilot 訪問權限');
      console.log('  3. 嘗試重新登入:');
      console.log('     gh auth logout');
      console.log('     gh auth login');
      console.log('  4. 若是公司帳號，確保使用公司的 GitHub 帳號登入');
    } else {
      if (config.output.verbose && lastError) {
        console.log(`   最後錯誤: ${lastError.message}`);
      }
      console.log('\n💡 建議：');
      console.log('   1. 檢查網路連線');
      console.log('   2. 嘗試更換 AI 模型（使用 --model 參數）');
      console.log('   3. 確認變更內容不會太複雜或太大');
    }

    throw new Error('無法產生有效的 commit message');
  }

  logger.success('產生的 Commit Message:');
  logger.separator('─', 60);
  console.log(commitMessage);
  logger.separator('─', 60);

  // 執行 commit
  logger.step('\n正在執行 commit...');
  execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
    stdio: 'inherit',
  });

  logger.success('Commit 完成！\n');
}
