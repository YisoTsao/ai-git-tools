#!/usr/bin/env node

/**
 * AI Git Tools CLI
 *
 * AI-powered Git automation for commit messages and PR generation
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { commitCommand } from '../src/commands/commit.js';
import { commitAllCommand } from '../src/commands/commit-all.js';
import { prCommand } from '../src/commands/pr.js';
import { initCommand } from '../src/commands/init.js';
import { usageCommand } from '../src/commands/usage.js';
import { modelInfoCommand } from '../src/commands/model-info.js';
import { registerCommand } from '../src/utils/cli-helpers.js';

// 讀取 package.json 獲取版本號
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('ai-git-tools')
  .description('AI-powered Git automation tools')
  .version(packageJson.version);

// Init 命令
registerCommand(program, 'init', '初始化配置檔案 (.ai-git-config.mjs)', [], initCommand);

// Commit 命令
registerCommand(program, 'commit', 'AI 自動生成 commit message 並提交', [
  { flags: '--model <model>', description: '指定 AI 模型' },
  { flags: '-v, --verbose', description: '顯示詳細輸出' },
  { flags: '--max-diff <number>', description: '最大 diff 長度' },
  { flags: '--max-retries <number>', description: '最大重試次數' },
], commitCommand);

// Commit All 命令
registerCommand(program, 'commit-all', '智慧分析所有變更並自動分組提交', [
  { flags: '--model <model>', description: '指定 AI 模型' },
  { flags: '-v, --verbose', description: '顯示詳細輸出' },
  { flags: '--max-diff <number>', description: '最大 diff 長度' },
  { flags: '--max-retries <number>', description: '最大重試次數' },
], commitAllCommand);

// PR 命令
registerCommand(program, 'pr', 'AI 自動生成 PR 並創建 Pull Request', [
  { flags: '--base <branch>', description: '指定目標分支' },
  { flags: '--model <model>', description: '指定 AI 模型' },
  { flags: '--preview', description: '僅預覽 PR 內容，不實際創建' },
  { flags: '--no-confirm', description: '跳過確認直接創建' },
  { flags: '--auto-labels', description: '自動添加 Labels (預設啟用)' },
  { flags: '--include-impact', description: '在 PR 中包含影響範圍分析和注意事項 (預設關閉)' },
  { flags: '--force-new', description: '強制創建新 PR，不更新現有 PR' },
], prCommand);

// Usage 命令
registerCommand(program, 'usage', '查看組織 GitHub Copilot 使用狀態與用量', [
  { flags: '--org <org>', description: '指定組織名稱（預設自動從 git remote 偵測）' },
  { flags: '--from <date>', description: '開始日期，格式 YYYY-MM-DD（預設：本月第一天）' },
  { flags: '--to <date>', description: '結束日期，格式 YYYY-MM-DD（預設：今天）' },
  { flags: '--top <n>', description: '只顯示前 N 名用戶' },
  { flags: '--sort <by>', description: '排序方式：credits（預設）| amount | name | activity' },
  { flags: '--team <slug>', description: '只顯示指定團隊的成員' },
  { flags: '--inactive', description: '同時顯示非活躍用戶' },
  { flags: '--breakdown', description: '顯示每日使用量明細' },
  { flags: '--export <file>', description: '匯出為 CSV 檔案（例如 usage.csv）' },
  { flags: '--json', description: '以 JSON 格式輸出完整資料' },
], usageCommand);

// Model Info 命令
registerCommand(program, 'model-info', '查看目前可用的 AI 模型資訊', [
  { flags: '--json', description: '以 JSON 格式輸出完整模型資料' },
  { flags: '--filter <keyword>', description: '依模型名稱或描述關鍵字過濾' },
  { flags: '--model <model>', description: '查詢單一模型的詳細資訊' },
], modelInfoCommand);

program.parse();
