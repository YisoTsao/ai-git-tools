/**
 * Init 命令
 * 初始化配置檔案
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Logger } from '../utils/logger.js';

const DEFAULT_CONFIG = `/**
 * AI Git Tools 配置檔案
 * 
 * 此檔案用於設定 AI 自動化 Git 工具的行為
 */

export default {
  // AI 相關配置
  ai: {
    model: 'claude-haiku-4.5', // AI 模型
    maxDiffLength: 8000, // 最大 diff 長度
    maxRetries: 3, // 最大重試次數
  },

  // GitHub 相關配置
  github: {
    defaultBase: 'release', // PR 預設目標分支（使用 'release' 自動偵測最新 release 分支，如 release-2025-m11.1）
    autoLabels: true, // 自動新增 Labels
    includeImpactAnalysis: false, // 是否在 PR 中包含影響範圍分析和注意事項（使用 --include-impact 啟用）
  },

  // Reviewers 相關配置
  reviewers: {
    interactiveReviewers: true, // 啟用互動式 reviewer 選擇（true: 顯示選單，false: 跳過，創建 PR 後手動添加）
    maxSuggested: 5, // 最多建議幾位 reviewers（基於 Git 歷史分析）
    gitHistoryDepth: 20, // 分析 Git 歷史的深度（最近 N 筆 commits）
    excludeAuthors: [], // 排除的作者列表（例如：['bot@example.com', 'ci-user']）
  },

  // 輸出相關配置
  output: {
    verbose: true, // 詳細輸出
  },
};
`;

export async function initCommand() {
  const logger = new Logger();
  const configPath = resolve(process.cwd(), '.ai-git-config.mjs');

  if (existsSync(configPath)) {
    logger.warning('配置檔案已存在: .ai-git-config.mjs');
    console.log('如要重新初始化，請先刪除現有配置檔案');
    return;
  }

  try {
    writeFileSync(configPath, DEFAULT_CONFIG, 'utf-8');
    logger.success('已建立配置檔案: .ai-git-config.mjs');
    console.log('\n請編輯此檔案以自訂配置');
  } catch (error) {
    logger.error(`建立配置檔案失敗: ${error.message}`);
    process.exit(1);
  }
}
