/**
 * Logger 工具
 * 統一供所有命令使用
 */

import { colors } from './constants.js';

export class Logger {
  info(msg) {
    console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
  }

  success(msg) {
    console.log(`${colors.green}✅${colors.reset} ${msg}`);
  }

  warning(msg) {
    console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`);
  }

  error(msg) {
    console.log(`${colors.red}❌${colors.reset} ${msg}`);
  }

  step(msg) {
    console.log(`${colors.cyan}▶${colors.reset} ${msg}`);
  }

  header(msg) {
    console.log(`\n${colors.bright}🤖 ${msg}${colors.reset}\n`);
  }

  separator(char = '═', length = 60) {
    console.log(char.repeat(length));
  }

  section(title) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`${colors.bright}${title}${colors.reset}`);
    console.log('═'.repeat(60));
  }
}

/**
 * 簡易日誌輔助物件（用於不需要實例化的場景）
 */
export const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}▶${colors.reset} ${msg}`),
};
