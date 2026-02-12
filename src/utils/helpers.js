/**
 * 工具函數
 */

import chalk from 'chalk';

/**
 * 錯誤處理
 */
export function handleError(error) {
  console.error(chalk.red('\n❌ 錯誤:'), error.message);
  
  if (error.stack && process.env.DEBUG) {
    console.error(chalk.gray(error.stack));
  }
}

/**
 * 驗證 commit message
 */
export function validateCommitMessage(message) {
  if (!message || message.length === 0) {
    return { valid: false, reason: 'Commit message 為空' };
  }

  if (message.length < 5) {
    return { valid: false, reason: 'Commit message 太短（少於 5 個字元）' };
  }

  // 檢查是否只包含特殊字元或空白
  if (!/[a-zA-Z0-9\u4e00-\u9fa5]/.test(message)) {
    return { valid: false, reason: 'Commit message 不包含有效字元' };
  }

  return { valid: true };
}

/**
 * 截斷長文本
 */
export function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '\n\n... [文本已截斷]';
}

/**
 * 格式化檔案列表
 */
export function formatFileList(files) {
  return files.map((file, index) => {
    const status = file.isNew ? '新增' : '修改';
    return `   [${index}] ${status} - ${file.filePath}`;
  }).join('\n');
}

/**
 * 取得專案類型提示
 */
export function getProjectTypePrompt() {
  return `你是一個資深前端工程師，熟悉現代 Web 開發規範。`;
}

/**
 * 取得 Conventional Commits 規則
 */
export function getConventionalCommitsRules() {
  return `**Commit Message 規則**：
1. 使用 Conventional Commits 格式：type(scope): subject
2. type 必須是：feat/fix/docs/style/refactor/test/chore/perf 其中之一
3. scope: 影響範圍（選填，如 api、ui、config、auth 等）
4. subject 限制在 50 字內，使用繁體中文
5. 如果變更複雜，加上 body 說明（使用 bullet points）

**重要**：
- 直接輸出 commit message 純文字，不要使用 markdown 程式碼區塊（\`\`\`）
- 不要加上任何前綴說明或後綴文字
- 第一行是標題，如有需要可加上空行後的詳細說明`;
}

/**
 * 延遲執行
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
