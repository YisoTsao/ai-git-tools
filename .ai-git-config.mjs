/**
 * AI Git Tools 配置檔範本
 * 
 * 此配置檔用於：
 * - gitai commit：自動生成單個 commit
 * - gitai commit-all：智能分析並批量 commit
 * - gitai pr：自動生成 PR
 * - gitai workflow：完整工作流程
 */
export default {
  // AI 設定
  ai: {
    model: 'gpt-4.1', // AI 模型：gpt-4.1, claude-haiku-4.5, claude-sonnet-4.5
    maxDiffLength: 8000, // 最大 diff 長度（字元）- 太小會導致 AI 看不到完整變更
    maxRetries: 3, // API 失敗時的最大重試次數
  },

  // GitHub 設定（用於 PR 工具）
  github: {
    orgName: '', // GitHub 組織名稱（留空則自動從 git remote 取得，或使用 'kingsinfo-project'）
    defaultBase: 'release', // 預設目標分支：'release' | 'auto' | 'main' | 'develop' | 'master'
    autoLabels: true, // 自動添加 Labels
  },

  // Reviewer 設定（用於 PR 工具）
  reviewers: {
    interactiveReviewers: true, // 是否啟用 reviewer 選擇功能（true: 啟用互動選擇 | false: 跳過選擇）
    maxSuggested: 5, // 最多建議的 reviewers 數量（基於 Git 歷史分析）
    gitHistoryDepth: 20, // Git 歷史分析深度（查看最近 N 筆 commit）
    excludeAuthors: [], // 排除特定作者（email 或 username），例如: ['bot@', 'ci-user']
  },

  // 輸出設定
  output: {
    verbose: false, // 顯示詳細輸出
    saveHistory: false, // 儲存操作歷史（未來功能）
  },
};
