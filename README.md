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

> 📊 想瞭解各命令的完整流程？請參考 [docs/flowchart.md](docs/flowchart.md)。

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

### 本機直接使用（尚未發布到 npm）

如果你想在套件正式發布到 npm 前，直接從本機原始碼執行：

```bash
# 方式一：使用 npm link 將本機套件連結到全域
npm link
npx ai-git-tools model-info

# 方式二：直接使用 node 執行 bin/cli.js
node bin/cli.js model-info
```

其他命令也適用相同方式，例如：

```bash
npx ai-git-tools init
npx ai-git-tools commit
npx ai-git-tools pr
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

### \`ai-git-tools init\`

初始化配置檔案

\`\`\`bash
npx ai-git-tools init
\`\`\`

### \`ai-git-tools commit\`

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
npx ai-git-tools commit --model gpt-5.6-luna
npx ai-git-tools commit --verbose
\`\`\`

### \`ai-git-tools commit-all\` (別名: \`ca\`)

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

### \`ai-git-tools pr\`

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

### \`ai-git-tools workflow\` (別名: \`wf\`)

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

### \`ai-git-tools model-info\`

查詢目前 GitHub Copilot SDK 支援的 AI 模型清單與詳細資訊

\`\`\`bash
npx ai-git-tools model-info [選項]

選項:
  --json                       以 JSON 格式輸出完整模型資料
  --filter <keyword>           依模型名稱、供應商或描述關鍵字過濾
  --model <model>              查詢單一模型的詳細資訊
  --no-cache                   忽略快取，強制重新連線 Copilot 取得最新資料
\`\`\`

**範例：**

\`\`\`bash
npx ai-git-tools model-info
npx ai-git-tools model-info --model gpt-5.6-luna
npx ai-git-tools model-info --filter claude
npx ai-git-tools model-info --json
\`\`\`

> 第一次執行會連線到 Copilot CLI 取得模型清單，可能需要數秒鐘；後續預設使用 24 小時快取。

### `ai-git-tools redmine-update`

分析目前 Git branch 的程式變更，依照指定的 Redmine Issue 個別產生開發更新內容，並在確認後更新 Issue 的狀態與筆記。

> 注意：npm 套件不會也不應該保存你的 Redmine API key。npm 上發布的是讀取環境變數的程式碼；每位使用者都要在自己的本機或 CI 執行環境設定變數。

#### Redmine 設定

請先在 Redmine 管理介面啟用 REST API，並從個人帳號頁面建立具備 Issue 讀寫權限的 API key。API key 只放在環境變數，不要放在 CLI 參數、設定檔或 Git。

不同 shell 的設定語法如下。請只選擇符合你目前終端機的區塊執行：

**bash / zsh（macOS、Linux 常見）**

```bash
export REDMINE_URL="https://redmine.example.com"
export REDMINE_API_KEY="你的 Redmine API key"

# 只確認是否已設定，不顯示 key 內容
test -n "$REDMINE_URL" && echo "REDMINE_URL 已設定"
test -n "$REDMINE_API_KEY" && echo "REDMINE_API_KEY 已設定"
```

**fish**

```fish
set -x REDMINE_URL "https://redmine.example.com"
set -x REDMINE_API_KEY "你的 Redmine API key"

test -n "$REDMINE_URL"; and echo "REDMINE_URL 已設定"
test -n "$REDMINE_API_KEY"; and echo "REDMINE_API_KEY 已設定"
```

**PowerShell**

```powershell
$env:REDMINE_URL = "https://redmine.example.com"
$env:REDMINE_API_KEY = "你的 Redmine API key"

if ($env:REDMINE_URL) { Write-Output "REDMINE_URL 已設定" }
if ($env:REDMINE_API_KEY) { Write-Output "REDMINE_API_KEY 已設定" }
```

**Windows Command Prompt（cmd）**

```bat
set REDMINE_URL=https://redmine.example.com
set REDMINE_API_KEY=你的 Redmine API key

if defined REDMINE_URL echo REDMINE_URL 已設定
if defined REDMINE_API_KEY echo REDMINE_API_KEY 已設定
```

完成環境變數設定後，`npx` 的使用方式完全相同：

```text
npx ai-git-tools redmine-update --issue 124 --preview --output redmine-update.json
```

環境變數只對目前的 shell 工作階段有效。若重新開啟終端機後不想重新設定，請使用各 shell 的啟動設定檔或作業系統的 Secret Manager；不要把真實 API key 提交到 Git。

也可以將專案內的 `.env.example` 複製成 `.env` 作為設定範本；目前 CLI 直接讀取 process environment，因此 shell 必須先載入該檔案：

```bash
cp .env.example .env
# 編輯 .env 填入實際 URL 與 API key
set -a
source .env
set +a
```

全域安裝或使用 `npx` 時，環境變數仍然設定在「執行命令的 shell」中：

```bash
npm install -g ai-git-tools
export REDMINE_URL="https://redmine.example.com"
export REDMINE_API_KEY="你的 Redmine API key"
ai-git-tools redmine-update --issue 124 --preview --output redmine-update.json
```

發布前可用以下指令確認 `.env.example` 會被包含在 npm 套件中，但不會包含 `.env`：

```bash
npm pack --dry-run
```

#### Preview 與 Apply

沒有 `--pr` 時，工具會比較目前 branch 與 `origin` 上依 branch 名稱版本號排序後最新的 `release-*` branch；`--base` 可指定其他比較基準。每個 `--issue` 都會先獨立讀取 Redmine 的 subject、description、status、tracker、custom fields 與 allowed statuses，再與共用 Git evidence 分開分析。

```bash
ai-git-tools redmine-update \
  --issue 124 \
  --issue 125 \
  --issue 126 \
  --issue 127 \
  --preview \
  --output redmine-update.json

# 套用已檢查的草稿，不重新呼叫 AI
ai-git-tools redmine-update --apply --from redmine-update.json
```

`--pr <number>` 是可選的補充 evidence，會加入 PR title、body、URL、merge state、commits 與 changed files；沒有 PR 仍可完整分析本機 Git diff。沒有 PR 時，工具不會自動推論已 merge、已部署或必須關閉 Issue。

執行過程會顯示目前階段，例如 Redmine 設定、Git evidence、PR 搜尋、每個 Issue 讀取、Copilot 分析與草稿產生進度。未指定 `--pr` 時，工具會依目前 branch 自動尋找對應的 GitHub PR；找不到時只省略 PR 資訊，不會影響本機 Git 分析。

notes 的 `### Git` 區塊會將 Branch 與 Base 連到對應的 GitHub branch；找到 PR 時也會顯示可點擊的 PR URL，找不到 PR 時不會顯示 PR 欄位。

Preview 會以色彩分開顯示每個 Issue 的開發內容、程式修改重點、API 變更、重要技術細節、修改檔案與實際 note。工具會從 Redmine API 找到 `已解決` 狀態並直接套用，不顯示互動式狀態選單。

原始 Issue description 會保留原始內容，供未來其它內容使用。AI 可產生多張流程圖，每張流程圖都有穩定的用途 ID，流程圖會放在 notes（公司 Redmine 已支援 notes Mermaid）。更新摘要會使用 Markdown 標題、項目符號與雙反引號標示程式路徑、API path、function 與 class。只有找到明確測試或驗證證據時才會加入驗證段落：

```text
{{mermaid
flowchart TD
    A[開始] --> B[處理]
    B --> C[完成]
}}
```

Issue 的基本責任分工如下：`description` 保存原始需求與未來其它內容，`status` 保存目前狀態，`notes` 保存 Git 開發紀錄與 Mermaid 流程圖。

當 preview 套用時，工具會直接將狀態設為 `已解決`，並同步將完成百分比設為 `100%`、完成日期設為執行當天，依欄位名稱找到 `程式碼更版進度` custom field，勾選測試機選項 `測`。custom field ID 會從 Issue API 動態取得，不會寫死公司 Redmine 的 ID。

同一個 Issue 若已經有先前的 notes，後續再次執行更新仍會新增一筆新的 Redmine journal，不會因為已有 notes 而略過；只有 Issue 的需求內容或狀態在產生草稿後被其他人修改時，才會停下來要求重新確認。

AI 產出的 notes 會固定整理成以下架構：

```markdown
## 開發內容

### 需求說明
一句話說明這次為什麼修改。

### 實作內容
- 實際完成事項
- 實際完成事項
- 實際完成事項

### 行為規則
| 情境 | 行為 |
|---|---|
| ... | ... |

### 影響範圍
受影響的功能、API、頁面或模組。

### 待確認
- [ ] AI 無法確認的項目
```

實作內容最多顯示 6 個項目；沒有待確認事項時不會建立空的 `待確認` 區塊。Git 與流程圖區塊會維持既有格式。

所有 Copilot AI 回應會在程式內統一轉換為台灣繁體中文，包含 Redmine notes、需求說明、實作內容、行為規則、影響範圍與 Mermaid 文字；不依賴模型自行遵守語言設定。

## ⚙️ 配置

配置檔案範例（\`.ai-git-config.js\`）：

\`\`\`javascript
export default {
  // AI 設定
  ai: {
    model: 'gpt-5.6-luna', // AI 模型
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

- **Node.js** >= 22.12.0
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

## 🚀 發布到 npm

若你是本專案維護者，發布新版本到 npm 的步驟如下：

### 1. 確認已登入 npm

```bash
npm whoami
```

若未登入，請執行：

```bash
npm login
```

### 2. 確認版本號

修改 [package.json](package.json) 中的 `version` 欄位（例如 `2.0.80`）。

> 每次發布版本號必須遞增，否則 npm 會拒絕。

### 3. 執行發布

```bash
npm run lint
npm publish --access public
```

`prepublishOnly` 會自動執行 `npm run lint`，`prepare` 會自動設定 `bin/cli.js` 為可執行檔。

### 4. 驗證發布

```bash
npm view ai-git-tools version
```

### 注意事項

- 發布前請確認工作目錄乾淨（`git status` 無未提交變更）
- npm 會自動修正 `package.json` 格式問題（例如 `repository.url` 會正規化為 `git+https://...`）
- 公開套件請使用 `--access public`，私有套件可省略或改為 `--access restricted`

## 🤔 常見問題

### Q: 需要安裝 GitHub Copilot 嗎？

A: 需要。本工具使用 GitHub Copilot SDK，需要有 GitHub Copilot 訂閱。

### Q: 可以使用其他 AI 模型嗎？

A: 可以。支援Claude Haiku 4.5、Claude Sonnet 4.5 等模型，可在配置檔中設定。

### Q: 配置檔一定要放在專案根目錄嗎？

A: 是的。工具會在當前目錄尋找配置檔。

### Q: 可以自訂 commit message 格式嗎？

A: 目前遵循 Conventional Commits 規範。未來版本會支援自訂格式。

### Q: 支援 Monorepo 嗎？

A: 支援。工具會分析整個倉庫的變更。

