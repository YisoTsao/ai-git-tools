/**
 * PR 命令
 * 
 * 生成 PR 標題、描述並創建 Pull Request
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig } from '../core/config-loader.js';
import { AIClient } from '../core/ai-client.js';
import { GitOperations } from '../core/git-operations.js';
import { GitHubAPI } from '../core/github-api.js';
import { Logger } from '../utils/logger.js';
import { 
  handleError, 
  truncateText,
  getProjectTypePrompt,
} from '../utils/helpers.js';

/**
 * 決定 base 分支
 */
async function determineBaseBranch(config, logger) {
  if (config.baseBranch && config.baseBranch !== 'auto') {
    return config.baseBranch;
  }

  // 嘗試找最新的 release 分支
  logger.startSpinner('尋找目標分支...');
  const latestRelease = GitHubAPI.getLatestReleaseBranch();
  
  if (latestRelease) {
    logger.succeedSpinner(`自動選擇目標分支: ${latestRelease}`);
    return latestRelease;
  }

  // 預設使用 main 或 master
  const defaultBranch = GitOperations.branchExists('main') ? 'main' : 'master';
  logger.succeedSpinner(`使用預設分支: ${defaultBranch}`);
  return defaultBranch;
}

/**
 * 使用 AI 生成 PR 內容
 */
async function generatePRContent(baseBranch, headBranch, config, logger) {
  logger.startSpinner('AI 正在分析變更並生成 PR 內容...');

  // 獲取 diff 和 commits
  const diff = GitOperations.getDiffBetweenBranches(baseBranch, headBranch);
  const commits = GitOperations.getCommitsBetweenBranches(baseBranch, headBranch);

  const truncatedDiff = truncateText(diff, config.ai.maxDiffLength);

  const aiClient = new AIClient(config);

  const prompt = `${getProjectTypePrompt()}

請根據以下資訊生成一個 Pull Request 的標題和描述。

**Commits 列表**：
${commits.join('\n')}

**Git Diff**：
${truncatedDiff}

**輸出格式**（JSON）：
{
  "title": "PR 標題（簡短、繁體中文，50 字內）",
  "description": "PR 描述（使用 Markdown 格式，繁體中文）"
}

**PR 描述應包含**：
1. ## 📝 變更摘要（簡述主要變更）
2. ## ✨ 主要功能（列出新增功能或修正項目）
3. ## 🔧 技術細節（選填，如有重要的技術變更）
4. ## ✅ 測試（如何測試這些變更）

請只輸出 JSON，不要其他文字。`;

  const response = await aiClient.sendAndWait(prompt);
  await aiClient.stop();

  try {
    const prContent = AIClient.parseJSON(response);
    logger.succeedSpinner('PR 內容生成完成');
    return prContent;
  } catch (error) {
    logger.failSpinner('生成 PR 內容失敗');
    throw new Error(`無法解析 AI 回應: ${error.message}`);
  }
}

/**
 * 選擇 Reviewers
 */
async function selectReviewers(changedFiles, config, logger) {
  if (!config.reviewers.autoSelect) {
    return [];
  }

  logger.startSpinner('分析潛在的 reviewers...');

  const contributorsMap = new Map();

  // 分析每個變更檔案的貢獻者
  for (const file of changedFiles.slice(0, 10)) { // 限制分析前 10 個檔案
    const contributors = GitOperations.getFileContributors(
      file,
      config.reviewers.gitHistoryDepth
    );

    for (const { email, name } of contributors) {
      // 排除設定中的作者
      if (config.reviewers.excludeAuthors.some(pattern => email.includes(pattern))) {
        continue;
      }

      const count = contributorsMap.get(email) || 0;
      contributorsMap.set(email, count + 1);
    }
  }

  // 排序並取前 N 位
  const suggested = Array.from(contributorsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, config.reviewers.maxSuggested)
    .map(([email]) => email);

  logger.succeedSpinner(`找到 ${suggested.length} 位潛在 reviewers`);

  if (suggested.length === 0) {
    return [];
  }

  // 互動式選擇
  const { selectedReviewers } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedReviewers',
      message: '選擇 Reviewers:',
      choices: suggested.map(email => ({
        name: email,
        value: email,
      })),
    },
  ]);

  return selectedReviewers;
}

/**
 * 智能選擇 Labels
 */
function suggestLabels(prContent, availableLabels) {
  const suggestions = [];
  const title = prContent.title.toLowerCase();
  const description = prContent.description.toLowerCase();

  // 根據關鍵字建議 labels
  const labelKeywords = {
    bug: ['fix', 'bug', '修正', '錯誤'],
    enhancement: ['feat', 'feature', '新增', '功能'],
    documentation: ['docs', '文件', 'readme'],
    refactor: ['refactor', '重構'],
    performance: ['perf', 'performance', '效能', '優化'],
    test: ['test', '測試'],
    ui: ['ui', 'style', '樣式', '介面'],
    api: ['api', 'endpoint'],
  };

  for (const [label, keywords] of Object.entries(labelKeywords)) {
    if (availableLabels.includes(label)) {
      if (keywords.some(kw => title.includes(kw) || description.includes(kw))) {
        suggestions.push(label);
      }
    }
  }

  return suggestions;
}

/**
 * PR 命令處理器
 */
export async function prCommand(options) {
  const logger = new Logger(options.verbose);

  try {
    logger.header('AI Auto PR Generator');

    // 檢查環境
    if (!GitOperations.isGitRepository()) {
      logger.error('當前目錄不是 Git 倉庫');
      process.exit(1);
    }

    if (!GitHubAPI.isAvailable()) {
      logger.error('GitHub CLI 未安裝或未認證');
      logger.info('請先安裝並設定 GitHub CLI:');
      logger.info('  brew install gh');
      logger.info('  gh auth login');
      process.exit(1);
    }

    // 載入配置
    const config = await loadConfig(options);

    // 確定分支
    const headBranch = config.headBranch || GitOperations.getCurrentBranch();
    const baseBranch = await determineBaseBranch(config, logger);

    console.log(chalk.cyan(`\n📌 分支資訊:`));
    console.log(`   Base: ${baseBranch}`);
    console.log(`   Head: ${headBranch}`);

    // 檢查 PR 是否已存在
    if (GitHubAPI.prExists(baseBranch, headBranch)) {
      logger.warn('PR 已存在');
      process.exit(0);
    }

    // 生成 PR 內容
    const prContent = await generatePRContent(baseBranch, headBranch, config, logger);

    console.log(chalk.cyan('\n📝 PR 標題:'));
    logger.code(prContent.title);

    console.log(chalk.cyan('\n📄 PR 描述:'));
    logger.code(prContent.description);

    // 如果是預覽模式，不創建 PR
    if (config.preview) {
      logger.info('預覽模式，不創建 PR');
      process.exit(0);
    }

    // 確認是否創建 PR
    if (!config.noConfirm) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: '是否創建 PR？',
          default: true,
        },
      ]);

      if (!confirm) {
        logger.info('已取消');
        process.exit(0);
      }
    }

    // 選擇 Reviewers
    let reviewers = [];
    if (config.reviewers.autoSelect) {
      const changes = GitOperations.getAllChanges();
      const changedFiles = changes.map(c => c.filePath);
      reviewers = await selectReviewers(changedFiles, config, logger);
    }

    // 選擇 Labels
    let labels = [];
    if (config.github.autoLabels) {
      const availableLabels = GitHubAPI.getLabels();
      const suggestedLabels = suggestLabels(prContent, availableLabels);
      
      if (suggestedLabels.length > 0) {
        const { selectedLabels } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedLabels',
            message: '選擇 Labels:',
            choices: suggestedLabels.map(label => ({
              name: label,
              value: label,
              checked: true,
            })),
          },
        ]);
        labels = selectedLabels;
      }
    }

    // 創建 PR
    logger.startSpinner('正在創建 PR...');
    
    GitHubAPI.createPR({
      title: prContent.title,
      body: prContent.description,
      base: baseBranch,
      head: headBranch,
      draft: config.draft,
      reviewers,
      labels,
    });

    logger.succeedSpinner('PR 創建成功！');

  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}
