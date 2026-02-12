/**
 * Workflow 命令
 * 
 * 完整工作流程：commit-all + pr
 */

import chalk from 'chalk';
import { commitAllCommand } from './commit-all.js';
import { prCommand } from './pr.js';
import { Logger } from '../utils/logger.js';
import { handleError } from '../utils/helpers.js';

/**
 * Workflow 命令處理器
 */
export async function workflowCommand(options) {
  const logger = new Logger(options.verbose);

  try {
    logger.header('完整工作流程：Commit All + PR');

    // 步驟 1: Commit All
    console.log(chalk.cyan('\n🔄 步驟 1: 智能分析並提交所有變更\n'));
    await commitAllCommand(options);

    // 步驟 2: 創建 PR
    console.log(chalk.cyan('\n🔄 步驟 2: 創建 Pull Request\n'));
    await prCommand(options);

    logger.header('工作流程完成！');

  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}
