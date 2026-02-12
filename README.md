# AI Git Tools

🤖 AI-powered Git automation tools for commit messages and PR generation

使用 AI 自動生成符合規範的 commit message 和 Pull Request，讓你的 Git 工作流程更智能、更高效！

## ✨ 功能特色

- **🎯 智能 Commit** - 自動分析變更並生成符合 Conventional Commits 規範的 commit message
- **🚀 批量提交** - 智能分析所有變更，自動分組並提交多個有意義的 commits
- **📤 自動 PR** - 生成完整的 PR 標題和描述，並自動創建 Pull Request
- **👥 智能 Reviewer** - 基於 Git 歷史分析，自動建議合適的 reviewers
- **🏷️ 自動 Labels** - 智能分析變更內容，自動添加合適的 labels
- **⚙️ 配置檔支援** - 靈活的配置選項，適應不同專案需求
- **🌐 跨專案通用** - 可在任何 Git 專案中使用

## 📦 安裝

### NPX 使用（推薦）

無需安裝，直接使用：

```bash
npx ai-git-tools init
npx ai-git-tools commit
```

### 全域安裝

```bash
npm install -g ai-git-tools
gitai init
```

### 專案內安裝

```bash
npm install --save-dev ai-git-tools

# 加入 package.json scripts
{
  "scripts": {
    "commit": "gitai commit",
    "commit:all": "gitai commit-all",
    "pr": "gitai pr"
  }
}
```

## 🚀 快速開始

### 1. 初始化配置

\`\`\`bash
npx gitai init
\`\`\`

這會在您的專案根目錄創建 \`.ai-git-config.js\` 配置檔。

### 2. 開始使用

#### 單次 Commit

已經使用 \`git add\` staged 好變更：

\`\`\`bash
git add src/components/Button.jsx
npx gitai commit
\`\`\`

#### 智能批量 Commit

自動分析所有變更並分組提交：

\`\`\`bash
npx gitai commit-all
# 或簡寫
npx gitai ca
\`\`\`

#### 創建 PR

\`\`\`bash
npx gitai pr
\`\`\`

#### 完整工作流程

Commit + PR 一次完成：

\`\`\`bash
npx gitai workflow
# 或簡寫
npx gitai wf
\`\`\`

## 📖 命令說明

### \`gitai init\`

初始化配置檔案

\`\`\`bash
npx gitai init
\`\`\`

### \`gitai commit\`

為已 staged 的變更生成並執行 commit

\`\`\`bash
npx gitai commit [選項]

選項:
  -m, --model <model>          指定 AI 模型
  -v, --verbose                顯示詳細輸出
  --max-diff <number>          最大 diff 長度
  --max-retries <number>       最大重試次數
\`\`\`

**範例：**

\`\`\`bash
npx gitai commit
npx gitai commit --model claude-haiku-4.5
npx gitai commit --verbose
\`\`\`

### \`gitai commit-all\` (別名: \`ca\`)

智能分析所有變更並自動分組提交

\`\`\`bash
npx gitai commit-all [選項]

選項:
  -m, --model <model>          指定 AI 模型
  -v, --verbose                顯示詳細輸出
  --max-diff <number>          最大 diff 長度
  --max-retries <number>       最大重試次數
\`\`\`

**範例：**

\`\`\`bash
npx gitai commit-all
npx gitai ca --verbose
\`\`\`

### \`gitai pr\`

生成 PR 並發送到 GitHub

\`\`\`bash
npx gitai pr [選項]

選項:
  -b, --base <branch>          目標分支
  -h, --head <branch>          來源分支
  -m, --model <model>          指定 AI 模型
  --draft                      創建草稿 PR
  --preview                    僅預覽，不創建 PR
  --no-confirm                 跳過確認直接創建
  --auto-reviewers             自動選擇 reviewers
  --auto-labels                自動添加 Labels
  --no-labels                  不添加 Labels
  --org <name>                 GitHub 組織名稱
\`\`\`

**範例：**

\`\`\`bash
npx gitai pr
npx gitai pr --draft
npx gitai pr --base main --auto-reviewers
npx gitai pr --preview
\`\`\`

### \`gitai workflow\` (別名: \`wf\`)

完整工作流程：commit-all + pr

\`\`\`bash
npx gitai workflow [選項]

選項:
  -m, --model <model>          指定 AI 模型
  -v, --verbose                顯示詳細輸出
  -b, --base <branch>          PR 目標分支
  --draft                      創建草稿 PR
  --auto-reviewers             自動選擇 reviewers
  --auto-labels                自動添加 Labels
\`\`\`

**範例：**

\`\`\`bash
npx gitai workflow
npx gitai wf --draft --auto-reviewers
\`\`\`

## ⚙️ 配置

配置檔案範例（\`.ai-git-config.js\`）：

\`\`\`javascript
export default {
  // AI 設定
  ai: {
    model: 'gpt-4.1', // AI 模型
    maxDiffLength: 8000, // 最大 diff 長度
    maxRetries: 3, // 失敗重試次數
  },

  // GitHub 設定
  github: {
    orgName: null, // 組織名稱（自動偵測）
    defaultBase: 'auto', // 預設目標分支
    autoLabels: true, // 自動添加 Labels
  },

  // Reviewer 設定
  reviewers: {
    autoSelect: false, // 啟用 reviewer 選擇
    maxSuggested: 5, // 最多建議人數
    gitHistoryDepth: 20, // Git 歷史分析深度
    excludeAuthors: [], // 排除特定作者
  },

  // 輸出設定
  output: {
    verbose: false, // 詳細輸出
    saveHistory: false, // 儲存歷史
  },
};
\`\`\`

## 🔧 環境需求

- **Node.js** >= 18.0.0
- **Git** 已安裝並設定
- **GitHub CLI** (用於 PR 功能)
  \`\`\`bash
  brew install gh
  gh auth login
  \`\`\`

## 💡 使用場景

### 場景 1：快速提交單個功能

\`\`\`bash
git add src/components/LoginForm.jsx
npx gitai commit
# ✅ 自動生成：feat(auth): 新增登入表單元件
\`\`\`

### 場景 2：整理多個變更

累積了多個功能變更，想要分開提交：

\`\`\`bash
npx gitai commit-all
# AI 會自動分析並分組：
# ✅ Commit 1: feat(auth): 新增登入功能
# ✅ Commit 2: fix(ui): 修正導航列顯示問題
# ✅ Commit 3: chore(deps): 更新依賴套件
\`\`\`

### 場景 3：快速發 PR

\`\`\`bash
npx gitai pr --auto-reviewers --auto-labels
# ✅ 自動生成完整的 PR 標題和描述
# ✅ 建議合適的 reviewers
# ✅ 添加相關的 labels
\`\`\`

### 場景 4：完整工作流程

\`\`\`bash
npx gitai workflow
# ✅ 自動分析並提交所有變更
# ✅ 創建 PR 並添加 reviewers 和 labels
\`\`\`

## 🎯 Commit Message 格式

自動生成的 commit message 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

\`\`\`
<type>(<scope>): <subject>

<body>
\`\`\`

**Type 類型：**
- \`feat\`: 新功能
- \`fix\`: 錯誤修正
- \`docs\`: 文件變更
- \`style\`: 程式碼格式調整
- \`refactor\`: 重構
- \`test\`: 測試
- \`chore\`: 雜項
- \`perf\`: 效能優化

**範例：**

\`\`\`
feat(auth): 新增使用者登入功能

- 實作登入 API endpoint
- 新增登入頁面 UI
- 整合 JWT 認證機制
\`\`\`

## 🤔 常見問題

### Q: 需要安裝 GitHub Copilot 嗎？

A: 需要。本工具使用 GitHub Copilot SDK，需要有 GitHub Copilot 訂閱。

### Q: 可以使用其他 AI 模型嗎？

A: 可以。支援 GPT-4.1、Claude Haiku 4.5、Claude Sonnet 4.5 等模型，可在配置檔中設定。

### Q: 配置檔一定要放在專案根目錄嗎？

A: 是的。工具會在當前目錄尋找配置檔。

### Q: 可以自訂 commit message 格式嗎？

A: 目前遵循 Conventional Commits 規範。未來版本會支援自訂格式。

### Q: 支援 Monorepo 嗎？

A: 支援。工具會分析整個倉庫的變更。

## 📝 授權

MIT License

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📧 聯絡

有問題或建議？歡迎[提交 Issue](https://github.com/yourusername/ai-git-tools/issues)

---

Made with ❤️ by AI Git Tools Team
