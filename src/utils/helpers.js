/**
 * Helper 工具函式
 * 統一供所有命令使用
 */

import { colors } from './constants.js';

/**
 * 自訂錯誤類別（PR 流程使用）
 */
export class PRError extends Error {
  constructor(message, code, suggestions = [], diagnosticCommand = null) {
    super(message);
    this.name = 'PRError';
    this.code = code;
    this.suggestions = suggestions;
    this.diagnosticCommand = diagnosticCommand;
  }
}

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
 * 檢測 Copilot 授權錯誤（code-analyzer 使用別名）
 */
export const isCopilotAuthError = isCopilotSubscriptionError;

/**
 * 檢測 Copilot 授權錯誤
 */
export function isCopilotSubscriptionError(error) {
  if (!error) return false;

  const message = (error.message || error.toString() || '').toLowerCase();
  const originalError = (error.originalError?.message || '').toLowerCase();

  return (
    error.isCopilotAuth === true ||
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not authorized') ||
    originalError.includes('permission') ||
    originalError.includes('unauthorized')
  );
}

/**
 * 錯誤處理
 */
export function handleError(error) {
  // 先檢查是否為 Copilot 授權相關的錯誤
  if (isCopilotSubscriptionError(error)) {
    console.log('\n🔐 看起來是 GitHub Copilot 授權問題\n');
    console.log('解決方案:');
    console.log('  1. 確認你的 GitHub 帳號已訂閱 GitHub Copilot');
    console.log('  2. 驗證 VS Code 中使用的 GitHub 帳號是否有 Copilot 訪問權限');
    console.log('  3. 嘗試重新登入:');
    console.log('     gh auth logout');
    console.log('     gh auth login');
    console.log('  4. 若是公司帳號，確保使用公司的 GitHub 帳號登入');
    console.log('');
    return;
  }

  if (error instanceof PRError) {
    console.error(`\n❌ 錯誤: ${error.message}`);

    if (error.suggestions && error.suggestions.length > 0) {
      console.log(`\n${colors.cyan}💡 建議解決方案:${colors.reset}`);
      error.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    if (error.diagnosticCommand) {
      console.log(`\n${colors.yellow}🔍 診斷命令:${colors.reset}`);
      console.log(`  ${error.diagnosticCommand}`);
    }
    return;
  }

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
