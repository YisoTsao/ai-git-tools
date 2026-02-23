/**
 * Logger 工具
 * 基於 scripts/ai-pr-modules/ui/logger.mjs
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

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
