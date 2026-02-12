/**
 * Commit 命令
 * 
 * 為已 staged 的變更生成 commit message 並提交
 */

import chalk from 'chalk';
import { loadConfig } from '../core/config-loader.js';
import { AIClient } from '../core/ai-client.js';
import { GitOperations } from '../core/git-operations.js';
import { Logger } from '../utils/logger.js';
import { 
  handleError, 
  validateCommitMessage, 
  truncateText,
  getProjectTypePrompt,
  getConventionalCommitsRules,
} from '../utils/helpers.js';

/**
 * Commit 命令處理器
 */
export async function commitCommand(options) {
  const logger = new Logger(options.verbose);

  try {
    // 檢查是否在 Git 倉庫中
    if (!GitOperations.isGitRepository()) {
      logger.error('當前目錄不是 Git 倉庫');
      process.exit(1);
    }

    // 載入配置
    const config = await loadConfig(options);
    
    if (config.output.verbose) {
      logger.debug('配置已載入');
      logger.debug(`AI Model: ${config.ai.model}`);
      logger.debug(`Max Diff Length: ${config.ai.maxDiffLength}`);
    }

    // 檢查是否有 staged 變更
    const diff = GitOperations.getStagedDiff();

    if (!diff.trim()) {
      logger.error('沒有 staged 的變更');
      logger.info('請先使用 git add 來 stage 你的變更');
      process.exit(1);
    }

    logger.startSpinner('正在分析變更內容...');

    // 截斷過長的 diff
    const truncatedDiff = truncateText(diff, config.ai.maxDiffLength);

    if (config.output.verbose && diff.length > config.ai.maxDiffLength) {
      logger.debug(`Diff 已從 ${diff.length} 字元截斷至 ${config.ai.maxDiffLength} 字元`);
    }

    // 使用 AI 生成 commit message
    const aiClient = new AIClient(config);
    
    logger.updateSpinner('AI 正在生成 commit message...');

    const prompt = `${getProjectTypePrompt()}

請根據以下 git diff 產生一則 commit message。

${getConventionalCommitsRules()}

**範例格式**：
feat(auth): 新增使用者登入功能

- 實作登入 API endpoint
- 新增登入頁面 UI
- 整合 JWT 認證機制

git diff:
${truncatedDiff}`;

    const rawMessage = await aiClient.sendAndWait(prompt);
    await aiClient.stop();

    const commitMessage = AIClient.cleanResponse(rawMessage);

    // 驗證 commit message
    const validation = validateCommitMessage(commitMessage);
    if (!validation.valid) {
      logger.failSpinner('生成 commit message 失敗');
      logger.error(validation.reason);
      process.exit(1);
    }

    logger.succeedSpinner('Commit message 生成完成');

    // 顯示生成的 commit message
    console.log(chalk.cyan('\n📝 生成的 Commit Message:'));
    logger.code(commitMessage);

    // 執行 commit
    logger.startSpinner('正在執行 commit...');
    await GitOperations.commit(commitMessage);
    logger.succeedSpinner('Commit 完成！');

    // 顯示最新的 commit
    console.log(chalk.cyan('\n📋 最新 commit:'));
    const recentCommits = GitOperations.getRecentCommits(1);
    console.log(recentCommits);

  } catch (error) {
    logger.failSpinner('操作失敗');
    handleError(error);
    process.exit(1);
  }
}
