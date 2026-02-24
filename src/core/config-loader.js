/**
 * 配置載入器
 * 基於 scripts/commit-modules/config-loader.mjs 和 scripts/ai-pr-modules/core/config-loader.mjs
 * 支援從任何目錄下的 .ai-git-config.mjs 載入配置
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

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
      default:
        break;
    }
  }

  return config;
}

/**
 * 載入配置（commit 工具使用）
 * 支援從目前工作目錄或使用者專案目錄載入 .ai-git-config.mjs
 */
export async function loadCommitConfig() {
  // 內建預設值
  const defaults = {
    ai: {
      model: 'gpt-4.1',
      maxDiffLength: 8000,
      maxRetries: 3,
    },
    output: {
      verbose: false,
      saveHistory: false,
    },
  };

  // 嘗試從目前工作目錄載入配置檔案
  const configPath = resolve(process.cwd(), '.ai-git-config.mjs');
  let userConfig = {};

  if (existsSync(configPath)) {
    try {
      const imported = await import(`file://${configPath}`);
      userConfig = imported.default || {};
    } catch (error) {
      console.warn(`⚠️  載入配置檔案失敗: ${error.message}`);
    }
  }

  // 合併配置
  const config = {
    ai: {
      model: userConfig.ai?.model ?? defaults.ai.model,
      maxDiffLength: userConfig.ai?.maxDiffLength ?? defaults.ai.maxDiffLength,
      maxRetries: userConfig.ai?.maxRetries ?? defaults.ai.maxRetries,
    },
    output: {
      verbose: userConfig.output?.verbose ?? defaults.output.verbose,
      saveHistory: userConfig.output?.saveHistory ?? defaults.output.saveHistory,
    },
  };

  // 命令行參數優先
  const cliConfig = parseCliArgs();
  if (cliConfig.model) config.ai.model = cliConfig.model;
  if (cliConfig.verbose) config.output.verbose = cliConfig.verbose;
  if (cliConfig.maxDiffLength) config.ai.maxDiffLength = cliConfig.maxDiffLength;
  if (cliConfig.maxRetries) config.ai.maxRetries = cliConfig.maxRetries;

  return config;
}

/**
 * 解析 PR 命令行參數
 */
export function parsePRCliArgs() {
  const args = process.argv.slice(2);
  const config = {
    baseBranch: null,
    headBranch: null,
    model: null,
    draft: false,
    preview: false,
    noConfirm: false,
    autoReviewers: false,
    autoLabels: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--base':
        config.baseBranch = args[++i];
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
      case '--auto-labels':
        config.autoLabels = true;
        break;
      default:
        break;
    }
  }

  return config;
}

/**
 * 載入 PR 配置
 */
export async function loadPRConfig() {
  // 嘗試從目前工作目錄載入配置檔案
  const configPath = resolve(process.cwd(), '.ai-git-config.mjs');
  let config = null;

  if (existsSync(configPath)) {
    try {
      const userConfig = await import(`file://${configPath}`);
      config = userConfig.default;
    } catch (error) {
      console.warn(`⚠️  載入配置檔案失敗: ${error.message}`);
    }
  }

  // 使用預設配置
  if (!config) {
    config = {
      ai: { model: 'gpt-4.1', maxDiffLength: 8000, maxRetries: 3 },
      github: { defaultBase: 'release', autoLabels: true },
      reviewers: { autoSelect: true, maxSuggested: 5, gitHistoryDepth: 20, excludeAuthors: [] },
      output: { verbose: false, saveHistory: false },
    };
  }

  // 確保 github 物件存在
  if (!config.github) {
    config.github = {};
  }

  // 合併命令行參數
  const cliConfig = parsePRCliArgs();
  if (cliConfig.model) config.ai.model = cliConfig.model;
  config.headBranch = cliConfig.headBranch;
  config.draft = cliConfig.draft;
  config.preview = cliConfig.preview;
  config.noConfirm = cliConfig.noConfirm;

  return config;
}
