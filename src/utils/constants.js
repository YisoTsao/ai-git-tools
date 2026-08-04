/**
 * 常數定義
 * 統一供所有命令與核心模組使用
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
