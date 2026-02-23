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
ai-git-tools init
# 或使用 npx（無需全域安裝）
npx ai-git-tools init
```

### 專案內安裝

```bash
npm install --save-dev ai-git-tools

# 加入 package.json scripts
{
  "scripts": {
    "commit": "ai-git-tools commit",
    "commit:all": "ai-git-tools commit-all",
    "pr": "ai-git-tools pr"
  }
}
```

## 🚀 快速開始

### 1. 初始化配置

\`\`\`bash
npx ai-git-tools init
\`\`\`

這會在您的專案根目錄創建 \`.ai-git-config.js\` 配置檔。

### 2. 開始使用

#### 單次 Commit

已經使用 \`git add\` staged 好變更：

\`\`\`bash
git add src/components/Button.jsx
npx ai-git-tools commit
\`\`\`

#### 智能批量 Commit

自動分析所有變更並分組提交：

\`\`\`bash
npx ai-git-tools commit-all
# 或簡寫
npx ai-git-tools ca
\`\`\`

#### 創建 PR

\`\`\`bash
npx ai-git-tools pr
\`\`\`

#### 完整工作流程

Commit + PR 一次完成：

\`\`\`bash
npx ai-git-tools workflow
# 或簡寫
npx ai-git-tools wf
\`\`\`

## 📖 命令說明

### \`gitai init\`

初始化配置檔案

\`\`\`bash
npx ai-git-tools init
\`\`\`

### \`gitai commit\`

為已 staged 的變更生成並執行 commit

\`\`\`bash
npx ai-git-tools commit [選項]

選項:
  -m, --model <model>          指定 AI 模型
  -v, --verbose                顯示詳細輸出
  --max-diff <number>          最大 diff 長度
  --max-retries <number>       最大重試次數
\`\`\`

**範例：**

\`\`\`bash
npx ai-git-tools commit
npx ai-git-tools commit --model claude-haiku-4.5
npx ai-git-tools commit --verbose
\`\`\`

### \`gitai commit-all\` (別名: \`ca\`)

智能分析所有變更並自動分組提交

\`\`\`bash
npx ai-git-tools commit-all [選項]

選項:
  -m, --model <model>          指定 AI 模型
  -v, --verbose                顯示詳細輸出
  --max-diff <number>          最大 diff 長度
  --max-retries <number>       最大重試次數
\`\`\`

**範例：**

\`\`\`bash
npx ai-git-tools commit-all
npx ai-git-tools ca --verbose
\`\`\`

### \`gitai pr\`

生成 PR 並發送到 GitHub

\`\`\`bash
npx ai-git-tools pr [選項]

選項:
  -b, --base <branch>          目標分支 (預設: 配置檔的 defaultBase 或自動偵測)
  -m, --model <model>          指定 AI 模型
  --preview                    僅預覽，不創建 PR
  --no-confirm                 跳過確認直接創建
  --interactive-reviewers      啟用互動式 reviewer 選擇 (預設啟用)
  --auto-labels                自動添加 Labels (預設啟用)
  --include-impact             在 PR 中包含影響範圍分析和注意事項 (預設關閉)
\`\`\`

**範例：**

\`\`\`bash
npx ai-git-tools pr
npx ai-git-tools pr --base release-2025-m12.1
npx ai-git-tools pr --preview
npx ai-git-tools pr --no-confirm
\`\`\`

### \`gitai workflow\` (別名: \`wf\`)

完整工作流程：commit-all + pr

\`\`\`bash
npx ai-git-tools workflow [選項]

選項:
  -m, --model <model>          指定 AI 模型
  -v, --verbose                顯示詳細輸出
  -b, --base <branch>          PR 目標分支 (預設: 配置檔 defaultBase 或自動偵測)
  --preview                    僅預覽 PR，不創建
  --auto-labels                自動添加 Labels (預設啟用)
\`\`\`

**範例：**

\`\`\`bash
npx ai-git-tools workflow
npx ai-git-tools wf --preview
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
    defaultBase: 'release', // 預設目標分支：'release'=自動查找最新，或指定具體分支名
    autoLabels: true, // 自動添加 Labels
    includeImpactAnalysis: false, // 是否在 PR 中包含影響範圍分析和注意事項 (使用 --include-impact 啟用)
  },

  // Reviewer 設定
  reviewers: {
    interactiveReviewers: true, // true=啟用互動式選擇，false=不添加任何 reviewers
    maxSuggested: 5, // 最多建議人數
    gitHistoryDepth: 20, // Git 歷史分析深度
    excludeAuthors: [], // 排除特定作者（最高優先順序，即使手動選擇也會被過濾）
  },

  // 輸出設定
  output: {
    verbose: false, // 詳細輸出
    saveHistory: false, // 儲存歷史
  },
};
\`\`\`

### defaultBase 配置說明

\`defaultBase\` 支援兩種模式：

#### 1. 自動模式（推薦）
```javascript
github: {
  defaultBase: 'release',  // 自動查找最新的 release 分支
}
```
- 工具會自動偵測所有 \`release-*\` 或 \`release/*\` 格式的分支
- 自動選擇最新版本（優先選擇月度分支，如 release-2025-m12.1）
- 適合經常更新 release 版本的專案

#### 2. 具體分支模式
```javascript
github: {
  defaultBase: 'release-2025-m12.1',  // 固定使用此分支
}
```
- 直接使用指定的分支名稱
- 適合需要固定某個版本的情況
- 或使用 \`main\`、\`develop\` 等標準分支

**範例輸出**：
```bash
# 使用 defaultBase: 'release'
配置檔指定使用 release 分支，正在偵測最新版本...
📋 偵測到的 release 分支:
  月度分支 (優先):
    1. release-2025-m12.1 ← 最新
    2. release-2025-m11.1
✅ 自動選擇最新 release 分支: release-2025-m12.1

# 使用 defaultBase: 'release-2025-m12.1'
✅ 使用配置檔指定的分支: release-2025-m12.1
```

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
npx ai-git-tools commit
# ✅ 自動生成：feat(auth): 新增登入表單元件
\`\`\`

### 場景 2：整理多個變更

累積了多個功能變更，想要分開提交：

\`\`\`bash
npx ai-git-tools commit-all
# AI 會自動分析並分組：
# ✅ Commit 1: feat(auth): 新增登入功能
# ✅ Commit 2: fix(ui): 修正導航列顯示問題
# ✅ Commit 3: chore(deps): 更新依賴套件
\`\`\`

### 場景 3：快速發 PR

\`\`\`bash
npx ai-git-tools pr --auto-labels
# ✅ 自動生成完整的 PR 標題和描述
# ✅ 建議合適的 reviewers
# ✅ 添加相關的 labels
\`\`\`

### 場景 4：完整工作流程

\`\`\`bash
npx ai-git-tools workflow
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
