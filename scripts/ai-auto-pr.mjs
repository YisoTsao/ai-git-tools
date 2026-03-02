#!/usr/bin/env node
/**
 * AI Auto PR Generator (重構版 v2.0)
 *
 * 自動生成 PR 標題和描述，並創建 Pull Request
 *
 * 功能特色：
 * - ✅ AI 生成 PR 內容（含專案規範檢查）
 * - ✅ 智能 Reviewer 選擇
 * - ✅ 影響範圍分析（Blast Radius）
 * - ✅ 自動 Label 標記（新功能）
 * - ✅ 配置檔支援（.ai-pr-config.mjs）
 * - ✅ 模組化架構
 *
 * 用法：
 *   node scripts/ai-auto-pr.mjs                           # 自動使用最新的 release 分支
 *   node scripts/ai-auto-pr.mjs --base release-2025-m11.1 # 指定 release 分支
 *   node scripts/ai-auto-pr.mjs --auto-labels             # 自動添加 Labels
 *   node scripts/ai-auto-pr.mjs --no-confirm              # 跳過確認直接創建
 *   node scripts/ai-auto-pr.mjs --preview                 # 僅預覽，不創建 PR
 */

import { execSync } from 'child_process';
import { PRWorkflow } from './ai-pr-modules/core/workflow.mjs';
import { loadConfig } from './ai-pr-modules/core/config-loader.mjs';
import { handleError } from './ai-pr-modules/utils/helpers.mjs';
import { Logger } from './ai-pr-modules/ui/logger.mjs';
import { colors } from './ai-pr-modules/utils/constants.mjs';

/**
 * 檢查 gh CLI 是否已登入且 token 有效，未登入則印出提示並回傳 false
 */
function checkGHAuth(logger) {
  try {
    execSync('gh api user --jq .login', { stdio: 'pipe' });
    return true;
  } catch (_) {
    logger.error('GitHub CLI 未登入或 token 已失效，無法執行 PR 相關操作');
    console.log('');
    console.log('請先執行認證：');
    console.log(`  ${colors.green}gh auth login${colors.reset}`);
    console.log('');
    console.log('登入時請確保選取以下範圍：');
    console.log('  - repo（必需）');
    console.log('  - read:org（如需 reviewer 功能）');
    console.log('');
    return false;
  }
}

/**
 * 主函數
 */
async function main() {
  const logger = new Logger();

  // ── 第一步：確認 gh CLI 已登入 ──────────────────────────
  if (!checkGHAuth(logger)) process.exit(1);

  try {
    logger.header('AI Auto PR Generator (v2.0 Enhanced)');

    // 載入配置
    const config = await loadConfig();

    if (config.output.verbose) {
      console.log('📋 使用配置：');
      console.log(`   AI Model: ${config.ai.model}`);
      console.log(`   Max Diff Length: ${config.ai.maxDiffLength}`);
    }

    // 執行工作流程
    const workflow = new PRWorkflow(config);
    await workflow.execute();

    // 確保程序正常退出
    process.exit(0);
  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}

main();
