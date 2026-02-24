import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * 解析命令列參數
 */
export function parseCliArgs() {
  const args = process.argv.slice(2);
  const config = {
    baseBranch: null,
    headBranch: null,
    model: null,
    preview: false,
    noConfirm: false,
    interactiveReviewers: undefined,
    autoLabels: null,
    includeImpactAnalysis: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--base':
        config.baseBranch = args[++i];
        break;
      case '--head':
        config.headBranch = args[++i];
        break;
      case '--model':
        config.model = args[++i];
        break;
      case '--preview':
        config.preview = true;
        break;
      case '--no-confirm':
        config.noConfirm = true;
        break;
      case '--interactive-reviewers':
        config.interactiveReviewers = true;
        break;
      case '--auto-labels':
        config.autoLabels = true;
        break;
      case '--include-impact':
        config.includeImpactAnalysis = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
      default:
        // 忽略未知的參數
        break;
    }
  }

  return config;
}

/**
 * 載入配置
 */
export async function loadConfig() {
  // 1. 載入預設配置
  const configPath = resolve(process.cwd(), '.ai-git-config.mjs');
  let config = null;

  if (existsSync(configPath)) {
    const userConfig = await import(configPath);
    config = userConfig.default;
  } else {
    // 使用內建預設值
    config = {
      ai: { model: 'gpt-4.1', maxDiffLength: 8000, maxRetries: 3 },
      github: { defaultBase: 'release', autoLabels: true, includeImpactAnalysis: false },
      reviewers: { interactiveReviewers: true, maxSuggested: 5, gitHistoryDepth: 20, excludeAuthors: [] },
      output: { verbose: false, saveHistory: false },
    };
  }

  // 2. 合併命令列參數
  const cliConfig = parseCliArgs();

  // 合併配置（CLI 參數優先）
  if (cliConfig.model) config.ai.model = cliConfig.model;
  if (cliConfig.interactiveReviewers !== undefined) config.reviewers.interactiveReviewers = cliConfig.interactiveReviewers;
  if (cliConfig.autoLabels !== null) config.github.autoLabels = cliConfig.autoLabels;
  if (cliConfig.includeImpactAnalysis !== null) config.github.includeImpactAnalysis = cliConfig.includeImpactAnalysis;

  // 其他 CLI 參數直接加入 config
  config.baseBranch = cliConfig.baseBranch;
  config.headBranch = cliConfig.headBranch;
  config.preview = cliConfig.preview;
  config.noConfirm = cliConfig.noConfirm;

  return config;
}

/**
 * 顯示幫助訊息
 */
function showHelp() {
  console.log(`
使用方式：
  npx ai-git-tools pr [選項]

選項：
  --base <branch>      指定目標分支 (預設: 使用配置檔的 defaultBase 或自動偵測)
  --model <model>      指定 AI 模型 (預設: gpt-4.1)
  --preview            僅預覽 PR 內容，不實際創建
  --no-confirm         跳過確認直接創建
  --interactive-reviewers  啟用互動式 reviewer 選擇 (預設啟用)
  --auto-labels        自動添加 Labels (預設啟用)
  --help               顯示此說明

範例：
  npx ai-git-tools pr
  npx ai-git-tools pr --base release-2025-m12.1
  npx ai-git-tools pr --preview
  npx ai-git-tools pr --no-confirm

配置檔範例 (.ai-git-config.js)：
  export default {
    github: {
      defaultBase: 'release-2025-m12.1',  // 指定預設目標分支
      autoLabels: true,
    },
    reviewers: {
      interactiveReviewers: true,  // 啟用互動式選擇 reviewers
    },
  };
  `);
}
