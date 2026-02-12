/**
 * Logger 工具
 * 
 * 提供格式化的日誌輸出
 */

import chalk from 'chalk';
import ora from 'ora';

export class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
    this.spinner = null;
  }

  /**
   * 標題
   */
  header(text) {
    console.log(chalk.cyan.bold(`\n${'='.repeat(60)}`));
    console.log(chalk.cyan.bold(text));
    console.log(chalk.cyan.bold('='.repeat(60)));
  }

  /**
   * 成功訊息
   */
  success(text) {
    console.log(chalk.green('✅ ' + text));
  }

  /**
   * 錯誤訊息
   */
  error(text) {
    console.log(chalk.red('❌ ' + text));
  }

  /**
   * 警告訊息
   */
  warn(text) {
    console.log(chalk.yellow('⚠️  ' + text));
  }

  /**
   * 資訊訊息
   */
  info(text) {
    console.log(chalk.blue('ℹ️  ' + text));
  }

  /**
   * 除錯訊息（只在 verbose 模式顯示）
   */
  debug(text) {
    if (this.verbose) {
      console.log(chalk.gray('🔍 ' + text));
    }
  }

  /**
   * 分隔線
   */
  divider(char = '-', length = 50) {
    console.log(char.repeat(length));
  }

  /**
   * 程式碼區塊
   */
  code(text) {
    this.divider();
    console.log(text);
    this.divider();
  }

  /**
   * 開始 spinner
   */
  startSpinner(text) {
    this.spinner = ora(text).start();
  }

  /**
   * 更新 spinner 文字
   */
  updateSpinner(text) {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  /**
   * 停止 spinner（成功）
   */
  succeedSpinner(text) {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    }
  }

  /**
   * 停止 spinner（失敗）
   */
  failSpinner(text) {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    }
  }

  /**
   * 顯示進度
   */
  progress(current, total, text = '') {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.round(percentage / 2));
    const empty = '░'.repeat(50 - Math.round(percentage / 2));
    console.log(`\r${bar}${empty} ${percentage}% ${text}`);
  }
}
