/**
 * CLI 命令註冊輔助函式
 * 統一處理命令註冊、錯誤處理與 process exit
 */

import { handleError } from './helpers.js';

/**
 * 註冊一個 CLI 命令，統一包裝 try/catch 與退出碼
 * @param {import('commander').Command} program
 * @param {string} name
 * @param {string} description
 * @param {Array<{flags: string, description: string, defaultValue?: any}>} options
 * @param {Function} action
 */
export function registerCommand(program, name, description, options = [], action) {
  const command = program.command(name).description(description);

  for (const option of options) {
    if (option.defaultValue !== undefined) {
      command.option(option.flags, option.description, option.defaultValue);
    } else {
      command.option(option.flags, option.description);
    }
  }

  command.action(async (options) => {
    try {
      await action(options);
      process.exit(0);
    } catch (error) {
      handleError(error);
      process.exit(1);
    }
  });
}

/**
 * 簡化版的命令 action 包裝器（用於已自行設定 option 的場景）
 */
export function wrapAction(action) {
  return async (options) => {
    try {
      await action(options);
      process.exit(0);
    } catch (error) {
      handleError(error);
      process.exit(1);
    }
  };
}
