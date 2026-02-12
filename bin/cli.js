#!/usr/bin/env node

/**
 * AI Git Tools CLI
 * 
 * AI-powered Git automation for commit messages and PR generation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { commitCommand } from '../src/commands/commit.js';
import { commitAllCommand } from '../src/commands/commit-all.js';
import { prCommand } from '../src/commands/pr.js';
import { workflowCommand } from '../src/commands/workflow.js';
import { initCommand } from '../src/commands/init.js';

const program = new Command();

program
  .name('gitai')
  .description('AI-powered Git automation tools')
  .version('1.0.0');

// Init 命令
program
  .command('init')
  .description('初始化配置檔案')
  .action(initCommand);

// Commit 命令
program
  .command('commit')
  .description('為已 staged 的變更生成並執行 commit')
  .option('-m, --model <model>', '指定 AI 模型')
  .option('-v, --verbose', '顯示詳細輸出')
  .option('--max-diff <number>', '最大 diff 長度', parseInt)
  .option('--max-retries <number>', '最大重試次數', parseInt)
  .action(commitCommand);

// Commit All 命令
program
  .command('commit-all')
  .alias('ca')
  .description('智能分析所有變更並自動分組提交')
  .option('-m, --model <model>', '指定 AI 模型')
  .option('-v, --verbose', '顯示詳細輸出')
  .option('--max-diff <number>', '最大 diff 長度', parseInt)
  .option('--max-retries <number>', '最大重試次數', parseInt)
  .action(commitAllCommand);

// PR 命令
program
  .command('pr')
  .description('生成 PR 並發送到 GitHub')
  .option('-b, --base <branch>', '目標分支')
  .option('-h, --head <branch>', '來源分支')
  .option('-m, --model <model>', '指定 AI 模型')
  .option('--draft', '創建草稿 PR')
  .option('--preview', '僅預覽，不創建 PR')
  .option('--no-confirm', '跳過確認直接創建')
  .option('--auto-reviewers', '自動選擇 reviewers')
  .option('--auto-labels', '自動添加 Labels')
  .option('--no-labels', '不添加 Labels')
  .option('--org <name>', 'GitHub 組織名稱')
  .action(prCommand);

// Workflow 命令
program
  .command('workflow')
  .alias('wf')
  .description('完整工作流程：commit-all + pr')
  .option('-m, --model <model>', '指定 AI 模型')
  .option('-v, --verbose', '顯示詳細輸出')
  .option('-b, --base <branch>', 'PR 目標分支')
  .option('--draft', '創建草稿 PR')
  .option('--auto-reviewers', '自動選擇 reviewers')
  .option('--auto-labels', '自動添加 Labels')
  .action(workflowCommand);

// 解析命令列參數
program.parse(process.argv);

// 如果沒有提供命令，顯示幫助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
