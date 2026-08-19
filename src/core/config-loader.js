/**
 * 配置載入器
 * 統一 commit 與 PR 命令的配置載入
 * 支援從目前工作目錄下的 .ai-git-config.mjs 載入配置
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * 內建預設配置
 */
const DEFAULT_CONFIG = {
  ai: {
    model: 'claude-haiku-4.5',
    maxDiffLength: 8000,
    maxRetries: 3,
  },
  github: {
    defaultBase: 'release',
    autoLabels: true,
    includeImpactAnalysis: false,
  },
  reviewers: {
    interactiveReviewers: true,
    maxSuggested: 5,
    gitHistoryDepth: 20,
    excludeAuthors: [],
  },
  output: {
    verbose: false,
    saveHistory: false,
  },
};

/**
 * 解析命令行參數
 */
export function parseCliArgs() {
  const args = process.argv.slice(2);
  const config = {
    model: null,
    verbose: false,
    maxDiffLength: null,
    maxRetries: null,
    baseBranch: null,
    headBranch: null,
    preview: false,
    noConfirm: false,
    interactiveReviewers: undefined,
    autoLabels: null,
    includeImpactAnalysis: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--model':
        config.model = args[++i];
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--max-diff':
        config.maxDiffLength = parseInt(args[++i], 10);
        break;
      case '--max-retries':
        config.maxRetries = parseInt(args[++i], 10);
        break;
      case '--base':
        config.baseBranch = args[++i];
        break;
      case '--head':
        config.headBranch = args[++i];
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
        break;
    }
  }

  return config;
}

/**
 * 深度合併物件（簡易版）
 */
function mergeDeep(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * 載入使用者配置檔案
 */
export async function loadUserConfig() {
  const configPath = resolve(process.cwd(), '.ai-git-config.mjs');

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const imported = await import(`file://${configPath}`);
    const userConfig = imported.default || {};
    return mergeDeep(DEFAULT_CONFIG, userConfig);
  } catch (error) {
    console.warn(`⚠️  載入配置檔案失敗: ${error.message}`);
    return DEFAULT_CONFIG;
  }
}

/**
 * 載入統一配置（commit 與 PR 共用）
 * 已廢棄：保留給舊 import 路徑向後相容，請改用 loadConfig
 */
export async function loadCommitConfig() {
  return loadConfig();
}

/**
 * 載入統一配置（PR 使用）
 */
export async function loadPRConfig() {
  return loadConfig();
}

/**
 * 載入統一配置
 */
export async function loadConfig() {
  const config = await loadUserConfig();
  const cliConfig = parseCliArgs();

  // 確保各區塊存在
  config.ai = config.ai || {};
  config.github = config.github || {};
  config.reviewers = config.reviewers || {};
  config.output = config.output || {};

  // 合併命令行參數（CLI 優先）
  if (cliConfig.model) config.ai.model = cliConfig.model;
  if (cliConfig.verbose) config.output.verbose = cliConfig.verbose;
  if (cliConfig.maxDiffLength) config.ai.maxDiffLength = cliConfig.maxDiffLength;
  if (cliConfig.maxRetries) config.ai.maxRetries = cliConfig.maxRetries;
  if (cliConfig.baseBranch) config.baseBranch = cliConfig.baseBranch;
  if (cliConfig.headBranch) config.headBranch = cliConfig.headBranch;
  if (cliConfig.preview) config.preview = cliConfig.preview;
  if (cliConfig.noConfirm) config.noConfirm = cliConfig.noConfirm;
  if (cliConfig.interactiveReviewers !== undefined) {
    config.reviewers.interactiveReviewers = cliConfig.interactiveReviewers;
  }
  if (cliConfig.autoLabels !== null) config.github.autoLabels = cliConfig.autoLabels;
  if (cliConfig.includeImpactAnalysis !== null) {
    config.github.includeImpactAnalysis = cliConfig.includeImpactAnalysis;
  }

  return config;
}

/**
 * 顯示 PR 幫助訊息
 */
function showHelp() {
  console.log(`
使用方式：
  npx ai-git-tools pr [選項]

選項：
  --base <branch>      指定目標分支 (預設: 使用配置檔的 defaultBase 或自動偵測)
  --model <model>      指定 AI 模型 (預設: claude-haiku-4.5)
  --preview            僅預覽 PR 內容，不實際創建
  --no-confirm         跳過確認直接創建
  --auto-labels        自動添加 Labels (預設啟用)
  --help               顯示此說明

範例：
  npx ai-git-tools pr
  npx ai-git-tools pr --base release-2025-m12.1
  npx ai-git-tools pr --preview
  npx ai-git-tools pr --no-confirm

配置檔範例 (.ai-git-config.mjs)：
  export default {
    github: {
      defaultBase: 'release-2025-m12.1',
      autoLabels: true,
    },
    reviewers: {
      interactiveReviewers: true,
    },
  };
  `);
}
