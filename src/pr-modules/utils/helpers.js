import { colors } from './constants.js';

/**
 * 日誌工具
 */
export const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}▶${colors.reset} ${msg}`),
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
 * 錯誤處理器
 */
export function handleError(error) {
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
    .map((r) => `  - [${r.id}] ${r.category}: ${r.desc}`)
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
