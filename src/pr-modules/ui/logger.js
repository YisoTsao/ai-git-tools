import { colors } from '../utils/constants.js';

/**
 * 日誌輸出工具
 */
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

  separator(char = '═', length = 80) {
    console.log(char.repeat(length));
  }

  section(title) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`${colors.bright}${title}${colors.reset}`);
    console.log('═'.repeat(80));
  }
}
