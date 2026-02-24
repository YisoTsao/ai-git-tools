#!/usr/bin/env node

/**
 * AI Git Tools CLI
 * 
 * AI-powered Git automation for commit messages and PR generation
 * 完全重寫版本基於 scripts/ 原始實現
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { commitCommand } from '../src/commands/commit.js';
import { commitAllCommand } from '../src/commands/commit-all.js';
import { prCommand } from '../src/commands/pr.js';
import { initCommand } from '../src/commands/init.js';

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
program
  .command('init')
  .description('初始化配置檔案 (.ai-git-config.mjs)')
  .action(async (options) => {
    try {
      await initCommand(options);
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  });

// Commit 命令
program
  .command('commit')
  .description('AI 自動生成 commit message 並提交')
  .option('--model <model>', '指定 AI 模型')
  .option('-v, --verbose', '顯示詳細輸出')
  .option('--max-diff <number>', '最大 diff 長度')
  .option('--max-retries <number>', '最大重試次數')
  .action(async (options) => {
    try {
      await commitCommand(options);
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  });

// Commit All 命令
program
  .command('commit-all')
  .description('智慧分析所有變更並自動分組提交')
  .option('--model <model>', '指定 AI 模型')
  .option('-v, --verbose', '顯示詳細輸出')
  .option('--max-diff <number>', '最大 diff 長度')
  .option('--max-retries <number>', '最大重試次數')
  .action(async (options) => {
    try {
      await commitAllCommand(options);
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  });

// PR 命令
program
  .command('pr')
  .description('AI 自動生成 PR 並創建 Pull Request')
  .option('--base <branch>', '指定目標分支')
  .option('--model <model>', '指定 AI 模型')
  .option('--preview', '僅預覽 PR 內容，不實際創建')
  .option('--no-confirm', '跳過確認直接創建')
  .option('--auto-labels', '自動添加 Labels (預設啟用)')
  .option('--include-impact', '在 PR 中包含影響範圍分析和注意事項 (預設關閉)')
  .action(async (options) => {
    try {
      await prCommand(options);
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  });

program.parse();
