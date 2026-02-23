/**
 * PR 命令 - 完整複製自 scripts/ai-auto-pr.mjs
 *
 * 使用 pr-modules 的完整邏輯（從 scripts/ai-pr-modules 複製）
 * 確保功能與 scripts 版本完全相同
 */

import { PRWorkflow } from '../pr-modules/core/workflow.js';
import { loadConfig } from '../pr-modules/core/config-loader.js';
import { handleError } from '../pr-modules/utils/helpers.js';
import { Logger } from '../pr-modules/ui/logger.js';

/**
 * PR 命令主函數（完全照抄 scripts/ai-auto-pr.mjs）
 */
export async function prCommand() {
  const logger = new Logger();

  try {
    logger.header('AI Auto PR Generator (v2.0 Enhanced)');

    // 載入配置（使用 scripts/ 的配置載入邏輯）
    const config = await loadConfig();

    if (config.output.verbose) {
      console.log('📋 使用配置：');
      console.log(`   AI Model: ${config.ai.model}`);
      console.log(`   Max Diff Length: ${config.ai.maxDiffLength}`);
    }

    // 執行工作流程（使用 scripts/ 的完整工作流）
    const workflow = new PRWorkflow(config);
    await workflow.execute();
  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}
