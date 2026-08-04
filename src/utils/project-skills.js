/**
 * 專案規範知識（供 AI prompt 使用）
 * 集中管理 skills 相關的 prompt 內容
 */

export const PROJECT_SKILLS_CONTEXT = {
  techStack: {
    framework: 'Next.js 12+ (Pages Router)',
    language: 'TypeScript + JavaScript 混合',
    styling: 'Tailwind CSS + Styled Components',
    clientState: 'Zustand',
    serverState: 'SWR',
    forms: 'React Hook Form + Zod',
  },
  reactBestPractices: [
    { id: 'async-parallel', category: '消除 Waterfall', desc: '使用 Promise.all() 處理獨立操作' },
    { id: 'async-suspense-boundaries', category: '消除 Waterfall', desc: '使用 Suspense 串流內容' },
    { id: 'bundle-barrel-imports', category: 'Bundle Size 優化', desc: '直接匯入,避免桶檔' },
    {
      id: 'bundle-dynamic-imports',
      category: 'Bundle Size 優化',
      desc: '使用 next/dynamic 動態載入重型元件',
    },
    {
      id: 'bundle-defer-third-party',
      category: 'Bundle Size 優化',
      desc: '延遲載入分析/日誌等第三方套件',
    },
    {
      id: 'server-cache-react',
      category: 'Server-Side 效能',
      desc: '使用 React.cache() 做請求級去重',
    },
    {
      id: 'server-serialization',
      category: 'Server-Side 效能',
      desc: '最小化傳給客戶端元件的資料',
    },
    { id: 'client-swr-dedup', category: '客戶端資料獲取', desc: '使用 SWR 自動去重請求' },
    { id: 'rerender-memo', category: 'Re-render 優化', desc: '將昂貴的計算抽取到 memoized 元件' },
    { id: 'rerender-derived-state', category: 'Re-render 優化', desc: '訂閱衍生布林值而非原始值' },
    {
      id: 'rerender-functional-setstate',
      category: 'Re-render 優化',
      desc: '使用函式型 setState 產生穩定 callback',
    },
    { id: 'js-early-exit', category: 'JS 效能', desc: '提早返回函式' },
    { id: 'js-set-map-lookups', category: 'JS 效能', desc: '使用 Set/Map 做 O(1) 查找' },
  ],
  frontendGuidelines: {
    architecture: 'Modified Atomic Design（UI / Page / Feature 三層）',
    naming: {
      component: 'PascalCase（如 UserProfile.jsx）',
      utility: 'kebab-case（如 api-client.js）',
      variable: 'camelCase',
      constant: 'UPPER_SNAKE_CASE',
      boolean: 'is/has/can 前綴',
      function: 'camelCase + 動詞',
    },
    importOrder: 'React 核心 → Next.js → 外部套件 → 內部模組(@/) → 相對路徑 → 樣式',
    stateManagement: {
      client: 'Zustand（UI 狀態、全域設定）',
      server: 'SWR（API 資料快取）',
      form: 'React Hook Form（表單輸入）',
      url: 'useRouter（分頁、篩選）',
    },
  },
};

/**
 * 取得 skills 規則的文字摘要（供 AI prompt 使用）
 */
export function getSkillsSummaryForPrompt(skillsContext = PROJECT_SKILLS_CONTEXT) {
  const rbp = skillsContext.reactBestPractices
    .map(r => `  - [${r.id}] ${r.category}: ${r.desc}`)
    .join('\n');
  const fg = skillsContext.frontendGuidelines;
  return `
## 專案規範（來自 .github/skills/）

### React Best Practices 規則（共 ${skillsContext.reactBestPractices.length} 條核心規則）
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
