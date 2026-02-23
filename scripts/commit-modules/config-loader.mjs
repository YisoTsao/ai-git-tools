import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * 解析命令列參數（用於 commit 工具）
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
      case '--help':
      case '-h':
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
 * 載入配置（用於 commit 工具）
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

  // 1. 載入配置檔
  const configPath = resolve(process.cwd(), '.ai-pr-config.mjs');
  let userConfig = {};

  if (existsSync(configPath)) {
    const imported = await import(configPath);

    userConfig = imported.default || {};
  }

  // 2. 合併配置檔與預設值（配置檔優先）
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

  // 3. 合併命令列參數（CLI 參數優先權最高）
  const cliConfig = parseCliArgs();

  if (cliConfig.model) config.ai.model = cliConfig.model;
  if (cliConfig.verbose) config.output.verbose = cliConfig.verbose;
  if (cliConfig.maxDiffLength) config.ai.maxDiffLength = cliConfig.maxDiffLength;
  if (cliConfig.maxRetries) config.ai.maxRetries = cliConfig.maxRetries;

  return config;
}

/**
 * 顯示幫助訊息
 */
function showHelp() {
  console.log(`
🤖 AI Auto Commit 工具

使用方式：
  node scripts/ai-auto-commit.mjs [選項]
  node scripts/ai-auto-commit-all.mjs [選項]

選項：
  --model <model>          指定 AI 模型 (預設: gpt-4.1)
  --verbose, -v            顯示詳細輸出
  --max-diff <number>      最大 diff 長度 (預設: 8000)
  --max-retries <number>   最大重試次數 (預設: 3)
  --help, -h               顯示此說明

配置檔：
  可在專案根目錄建立 .ai-pr-config.mjs 檔案進行配置

  範例：
  export default {
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

範例：
  node scripts/ai-auto-commit.mjs
  node scripts/ai-auto-commit.mjs --model gpt-4.1 --verbose
  node scripts/ai-auto-commit-all.mjs --max-diff 10000
  `);
}
