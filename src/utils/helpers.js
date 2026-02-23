/**
 * Helper 工具函式
 * 基於 scripts/ai-pr-modules/utils/helpers.mjs
 */

/**
 * 清理 commit message
 * 移除 markdown 程式碼區塊標記
 */
export function cleanCommitMessage(message) {
  if (!message) return '';

  let cleaned = message.trim();

  // 移除 markdown 程式碼區塊標記
  cleaned = cleaned.replace(/^```[\w]*\n/gm, '');
  cleaned = cleaned.replace(/\n```$/gm, '');
  cleaned = cleaned.replace(/^```$/gm, '');

  // 移除開頭和結尾的引號
  cleaned = cleaned.replace(/^["']|["']$/g, '');

  return cleaned.trim();
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
 * 錯誤處理
 */
export function handleError(error) {
  console.error('\n❌ 錯誤:', error.message);
  
  if (error.suggestions && error.suggestions.length > 0) {
    console.log('\n💡 建議解決方案:');
    error.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  }
  
  if (error.stack && process.env.VERBOSE) {
    console.error('\n堆疊追蹤:');
    console.error(error.stack);
  }
}

/**
 * 獲取專案類型提示（用於 AI prompt）
 */
export function getProjectTypePrompt() {
  return `你是一個資深前端工程師，熟悉 Next.js 專案的開發規範。

**專案背景**：
- Next.js 12+ (Pages Router)
- TypeScript + JavaScript 混合
- Tailwind CSS + Styled Components
- Zustand (客戶端狀態) + SWR (伺服器資料獲取)
- React Hook Form + Zod (表單處理)`;
}
