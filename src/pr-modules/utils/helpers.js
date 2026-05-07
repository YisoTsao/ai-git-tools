import { colors } from './constants.js';

/**
 * 日誌工具
 */
export const log = {
  info: msg => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: msg => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: msg => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: msg => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: msg => console.log(`${colors.cyan}▶${colors.reset} ${msg}`),
};

/**
 * 自訂錯誤類別
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
 * 檢測 Copilot 授權錯誤
 */
export function isCopilotAuthError(error) {
  const message = (error?.message || error?.toString() || '').toLowerCase();
  const originalMessage = (error?.originalError?.message || '').toLowerCase();

  return (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not authorized') ||
    message.includes('authentication failed') ||
    message.includes('access denied') ||
    message.includes('you do not have access') ||
    message.includes('copilot') ||
    originalMessage.includes('permission') ||
    originalMessage.includes('unauthorized')
  );
}

/**
 * 錯誤處理器
 */
export function handleError(error) {
  // 先檢查是否為 Copilot 授權相關的錯誤
  if (isCopilotAuthError(error)) {
    log.error('看起來是 GitHub Copilot 授權問題\n');
    console.log(`${colors.cyan}解決方案:${colors.reset}`);
    console.log('  1. 確認你的 GitHub 帳號已訂閱 GitHub Copilot');
    console.log('  2. 驗證 VS Code 中使用的 GitHub 帳號是否有 Copilot 存取權限');
    console.log('  3. 嘗試重新登入:');
    console.log('     gh auth logout');
    console.log('     gh auth login');
    console.log('  4. 若是公司帳號，確保使用公司的 GitHub 帳號登入\n');
    return;
  }

  if (error instanceof PRError) {
    log.error(error.message);

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
  } else {
    log.error(`錯誤: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

/**
 * 取得 skills 規則的文字摘要（供 AI prompt 使用）
 */
export function getSkillsSummaryForPrompt(PROJECT_SKILLS_CONTEXT) {
  const rbp = PROJECT_SKILLS_CONTEXT.reactBestPractices
    .map(r => `  - [${r.id}] ${r.category}: ${r.desc}`)
    .join('\n');
  const fg = PROJECT_SKILLS_CONTEXT.frontendGuidelines;
  return `
## 專案規範（來自 .github/skills/）

### React Best Practices 規則（共 ${PROJECT_SKILLS_CONTEXT.reactBestPractices.length} 條核心規則）
${rbp}

### Frontend Guidelines 規範
- 架構: ${fg.architecture}
- 元件命名: ${fg.naming.component}
- 工具檔案: ${fg.naming.utility}
- 變數: ${fg.naming.variable} / 常數: ${fg.naming.constant} / 布林值: ${fg.naming.boolean}
- Import 順序: ${fg.importOrder}
- 狀態管理: 客戶端=${fg.stateManagement.client} | 伺服器=${fg.stateManagement.server} | 表單=${fg.stateManagement.form}
`;
}
