/**
 * 常數定義
 */

export const CONSTANTS = {
  // API 與緩衝區限制
  MAX_DIFF_LENGTH: 8000,
  MAX_BUFFER_SIZE: 10 * 1024 * 1024,

  // 顯示限制
  MAX_COMMIT_PREVIEW: 5,
  MAX_FILES_IN_PROMPT: 50,
  MAX_COMMITS_IN_PROMPT: 10,
  DIFF_CONTEXT_LINES: 50,

  // Reviewer 相關
  MAX_SUGGESTED_REVIEWERS: 5,
  AUTO_REVIEWERS_COUNT: 2,
  GIT_HISTORY_COMMITS: 20,

  // GitHub API 延遲
  GITHUB_API_DELAY: 500,
  GITHUB_SYNC_DELAY: 2000,
  GITHUB_TEAM_SYNC_DELAY: 1000,
};

// 顏色輸出
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// ANSI 游標控制
export const cursor = {
  hide: '\x1B[?25l',
  show: '\x1B[?25h',
  up: (n = 1) => `\x1B[${n}A`,
  down: (n = 1) => `\x1B[${n}B`,
  clearLine: '\x1B[2K\r',
  saveCursor: '\x1B[s',
  restoreCursor: '\x1B[u',
};

// 專案規範知識（來自 .github/skills/）
export const PROJECT_SKILLS_CONTEXT = {
  techStack: {
    framework: 'Next.js 12+ (Pages Router)',
    language: 'TypeScript + JavaScript 混合',
    styling: 'Tailwind CSS + Styled Components',
    clientState: 'Zustand',
    serverState: 'SWR',
    forms: 'React Hook Form + Zod',
  },
  // 來自 .github/skills/react-best-practices/SKILL.md
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
  // 來自 .github/skills/frontend-guidelines/SKILL.md
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
