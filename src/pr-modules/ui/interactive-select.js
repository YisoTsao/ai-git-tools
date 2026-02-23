import { emitKeypressEvents } from 'readline';
import { colors, cursor } from '../utils/constants.js';

/**
 * 互動式選擇工具（使用方向鍵和空白鍵）
 */
export class InteractiveSelect {
  /**
   * @param {Array} options - 選項陣列
   * @param {string} title - 標題
   * @returns {Promise<{cancelled: boolean, selected: Array}>}
   */
  async select(options, title = '選擇項目') {
    return new Promise((resolve) => {
      let currentIndex = 0;
      const selected = new Set();

      // 準備選項列表
      const items = options.map((opt, idx) => ({
        ...opt,
        index: idx,
      }));

      const render = () => {
        // 清除整個選擇區域
        if (items.length > 0) {
          // 向上移動到開始位置
          for (let i = 0; i < items.length + 3; i++) {
            process.stdout.write(cursor.up(1));
          }
        }

        // 清除並重新繪製每一行
        process.stdout.write(cursor.clearLine);
        console.log(`${colors.bright}${title}${colors.reset}`);

        process.stdout.write(cursor.clearLine);
        console.log(
          `${colors.yellow}↑/↓: 移動  Space: 選擇/取消  Enter: 確認  q: 跳過${colors.reset}`
        );

        process.stdout.write(cursor.clearLine);
        console.log('');

        items.forEach((item, idx) => {
          const isSelected = selected.has(idx);
          const isCurrent = idx === currentIndex;

          const checkbox = isSelected ? `${colors.green}[✓]${colors.reset}` : '[ ]';
          const cursor_marker = isCurrent ? `${colors.cyan}▶${colors.reset}` : ' ';
          const label = item.label || item.name || item.login;
          const extra = item.extra || '';

          process.stdout.write(cursor.clearLine);
          console.log(`${cursor_marker} ${checkbox} ${label}${extra}`);
        });
      };

      const cleanup = () => {
        process.stdin.setRawMode(false);
        process.stdin.removeAllListeners('keypress');
        process.stdout.write(cursor.show);
        console.log('');
      };

      const handleKeypress = (str, key) => {
        if (!key) return;

        // q or Ctrl+C to quit
        if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
          cleanup();
          resolve({ cancelled: true, selected: [] });
          return;
        }

        // Arrow up
        if (key.name === 'up') {
          currentIndex = Math.max(0, currentIndex - 1);
          render();
        }

        // Arrow down
        else if (key.name === 'down') {
          currentIndex = Math.min(items.length - 1, currentIndex + 1);
          render();
        }

        // Space to toggle selection
        else if (key.name === 'space') {
          if (selected.has(currentIndex)) {
            selected.delete(currentIndex);
          } else {
            selected.add(currentIndex);
          }
          render();
        }

        // Enter to confirm
        else if (key.name === 'return') {
          cleanup();
          const selectedItems = Array.from(selected).map((idx) => items[idx]);
          resolve({ cancelled: false, selected: selectedItems });
        }
      };

      // 初始化
      process.stdout.write(cursor.hide);

      // 先印出佔位用的空行
      for (let i = 0; i < items.length + 3; i++) {
        console.log('');
      }

      render();

      // 啟用 raw mode 和 keypress
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();

        // 需要監聽 keypress 事件
        emitKeypressEvents(process.stdin);

        process.stdin.on('keypress', handleKeypress);
      } else {
        cleanup();
        resolve({ cancelled: true, selected: [] });
      }
    });
  }
}
