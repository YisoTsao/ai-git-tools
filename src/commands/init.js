/**
 * Init 命令
 * 
 * 初始化配置檔案
 */

import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Logger } from '../utils/logger.js';
import { handleError } from '../utils/helpers.js';

const CONFIG_TEMPLATE = `/**
 * AI Git Tools 配置檔
 * 
 * 此配置檔用於：
 * - gitai commit：自動生成單個 commit
 * - gitai commit-all：智能分析並批量 commit
 * - gitai pr：自動生成 PR
 * - gitai workflow：完整工作流程
 */
export default {
  // AI 設定
  ai: {
    model: 'gpt-4.1', // AI 模型：gpt-4.1, claude-haiku-4.5 等
    maxDiffLength: 8000, // 最大 diff 長度（字元）
    maxRetries: 3, // API 失敗時的最大重試次數
  },

  // GitHub 設定（用於 PR 工具）
  github: {
    orgName: null, // GitHub 組織名稱（自動從 git remote 取得）
    defaultBase: 'auto', // 預設目標分支：'auto' | 'main' | 'develop'
    autoLabels: true, // 自動添加 Labels
  },

  // Reviewer 設定（用於 PR 工具）
  reviewers: {
    autoSelect: false, // 是否啟用 reviewer 選擇功能
    maxSuggested: 5, // 最多建議的 reviewers 數量
    gitHistoryDepth: 20, // Git 歷史分析深度
    excludeAuthors: [], // 排除特定作者，例如: ['bot@', 'ci-user']
  },

  // 輸出設定
  output: {
    verbose: false, // 顯示詳細輸出
    saveHistory: false, // 儲存操作歷史（未來功能）
  },
};
`;

/**
 * Init 命令處理器
 */
export async function initCommand() {
  const logger = new Logger();

  try {
    logger.header('初始化 AI Git Tools 配置檔');

    const configFiles = [
      '.ai-git-config.js',
      '.ai-git-config.mjs',
      'ai-git.config.js',
      'ai-git.config.mjs',
    ];

    // 檢查是否已存在配置檔
    const existingConfig = configFiles.find(file => 
      existsSync(resolve(process.cwd(), file))
    );

    if (existingConfig) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `配置檔 ${existingConfig} 已存在，是否覆蓋？`,
          default: false,
        },
      ]);

      if (!overwrite) {
        logger.info('已取消');
        process.exit(0);
      }
    }

    // 詢問配置檔名稱
    const { configFileName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'configFileName',
        message: '選擇配置檔名稱:',
        choices: [
          { name: '.ai-git-config.js (推薦)', value: '.ai-git-config.js' },
          { name: '.ai-git-config.mjs', value: '.ai-git-config.mjs' },
          { name: 'ai-git.config.js', value: 'ai-git.config.js' },
          { name: 'ai-git.config.mjs', value: 'ai-git.config.mjs' },
        ],
        default: '.ai-git-config.js',
      },
    ]);

    // 詢問基本設定
    const { model, autoReviewers, autoLabels } = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: '選擇 AI 模型:',
        choices: [
          { name: 'GPT-4.1 (推薦)', value: 'gpt-4.1' },
          { name: 'Claude Haiku 4.5', value: 'claude-haiku-4.5' },
          { name: 'Claude Sonnet 4.5', value: 'claude-sonnet-4.5' },
        ],
        default: 'gpt-4.1',
      },
      {
        type: 'confirm',
        name: 'autoReviewers',
        message: '啟用自動 Reviewer 選擇？',
        default: false,
      },
      {
        type: 'confirm',
        name: 'autoLabels',
        message: '啟用自動 Label 標記？',
        default: true,
      },
    ]);

    // 生成配置內容
    let configContent = CONFIG_TEMPLATE;
    
    if (model !== 'gpt-4.1') {
      configContent = configContent.replace("model: 'gpt-4.1'", `model: '${model}'`);
    }
    
    if (autoReviewers) {
      configContent = configContent.replace('autoSelect: false', 'autoSelect: true');
    }
    
    if (!autoLabels) {
      configContent = configContent.replace('autoLabels: true', 'autoLabels: false');
    }

    // 寫入配置檔
    const configPath = resolve(process.cwd(), configFileName);
    writeFileSync(configPath, configContent, 'utf-8');

    logger.success(`配置檔已創建: ${configFileName}`);
    logger.info('\n下一步：');
    logger.info('  1. 編輯配置檔以自訂設定');
    logger.info('  2. 執行 gitai commit 或 gitai commit-all 開始使用');
    logger.info('\n查看完整文檔: https://github.com/yiso05255/ai-git-tools');

  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}
