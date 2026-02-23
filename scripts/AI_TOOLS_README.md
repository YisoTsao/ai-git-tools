# 🤖 AI 自動化工具使用指南

使用 GitHub Copilot SDK 自動化 Git 工作流程，讓 AI 幫你寫 commit message 和 PR 描述！

> **🎉 最新更新**: AI Auto PR 已升級至 v2.0！  
> 新增：模組化架構、自動 Label 標記、配置檔支援  

## 📋 目錄

- [功能一覽](#-功能一覽)
- [快速開始](#-快速開始)
- [工具說明](#-工具說明)
- [使用範例](#-使用範例)
- [進階技巧](#-進階技巧)
- [疑難排解](#-疑難排解)

---

## ✨ 功能一覽

| 工具                   | 指令                    | 功能                                   | 適用情境                      |
| ---------------------- | ----------------------- | -------------------------------------- | ----------------------------- |
| 🎯 **自動 Commit**     | `npm run ai:commit`     | 分析已 staged 變更，生成單個 commit    | 已經 `git add` 好的變更       |
| 🚀 **智能批量 Commit** | `npm run ai:commit:all` | 自動分析所有未提交變更，按功能分組提交 | 累積多個功能，想要分開 commit |
| 📤 **自動 PR**         | `npm run ai:pr`         | 生成 PR 並發送到 GitHub                | 準備發 PR 時                  |
| 🔄 **完整工作流程**    | `npm run ai:workflow`   | Commit + PR 一次完成                   | 想要一條龍服務                |

---

## 🚀 快速開始

### 1. 確認環境

```bash
# 檢查 GitHub CLI 是否已安裝
gh --version

# 如果未安裝
brew install gh
gh auth login
```

### 2. 選擇適合的工具

#### 情境 A：我已經 `git add` 好了，想快速 commit

```bash
npm run ai:commit
```

#### 情境 B：我改了很多檔案，想自動分類 commit

```bash
npm run ai:commit:all
```

#### 情境 C：我要發 PR

```bash
npm run ai:pr
```

#### 情境 D：我想一次搞定所有事

```bash
npm run ai:workflow
```

---

## 🛠️ 工具說明

### 🎯 工具 1：自動 Commit (`ai:commit`)

**適用時機：** 已經使用 `git add` staged 好的變更

**使用步驟：**

```bash
# 1. 先 stage 你的變更
git add src/components/Button.jsx

# 2. 執行自動 commit
npm run ai:commit
```

**執行流程：**

```
檢查 staged 變更
    ↓
AI 分析 diff
    ↓
生成 Conventional Commits 格式的 message
    ↓
自動執行 git commit
    ↓
完成！
```

**輸出範例：**

```
📝 正在分析變更內容...

✅ 生成的 Commit Message:
──────────────────────────────────────────────────
feat: 新增 Button 元件的 loading 狀態

- 新增 isLoading prop
- 顯示 spinner 圖示
- 禁用點擊互動
──────────────────────────────────────────────────

🚀 正在執行 commit...
✅ Commit 完成！

📋 最新 commit:
abc1234 feat: 新增 Button 元件的 loading 狀態
```

---

### 🚀 工具 2：智能批量 Commit (`ai:commit:all`) ⭐ 新功能

**適用時機：** 累積了多個功能變更，想要自動分類成多個有意義的 commits

**使用步驟：**

```bash
# 不需要先 git add，直接執行
npm run ai:commit:all
```

**執行流程：**

```
掃描所有未提交的檔案
    ↓
AI 分析每個檔案的變更
    ↓
按功能/目的自動分組
    ↓
為每組生成 commit message
    ↓
自動 git add + commit（多個 commits）
    ↓
完成！
```

**輸出範例：**

```
🚀 智能分析所有變更並自動提交

📋 掃描變更中...
📊 找到 6 個變更的檔案:
   [0] 修改 - components/Modal/index.jsx
   [1] 修改 - components/Modal/SlidePanel.jsx
   [2] 新增 - components/UI/Button/BaseButton.jsx
   [3] 修改 - pages/crm/stores/[id]/index.jsx
   [4] 修改 - scripts/ai-auto-commit-all.mjs
   [5] 修改 - package.json

🤖 正在使用 AI 分析變更並分組...

✅ AI 分析完成，共分為 3 個群組:
   群組 1: 新增 Modal 元件 (feat)
   └─ 包含 2 個檔案
   群組 2: 新增 Button 元件 (feat)
   └─ 包含 1 個檔案
   群組 3: 優化工具腳本 (chore)
   └─ 包含 3 個檔案

============================================================
開始執行提交...
============================================================

📦 處理群組: 新增 Modal 元件
   類型: feat
   檔案數量: 2
   ├─ components/Modal/index.jsx
   ├─ components/Modal/SlidePanel.jsx
   └─ 生成 commit message...

   📝 Commit Message:
   ──────────────────────────────────────────────────
   feat: 新增 SlidePanel 滑入面板元件

   - 新增 SlidePanel 右側滑入動畫
   - 整合至 Modal 模組
   - 支援自訂寬度和標題
   ──────────────────────────────────────────────────
   ✅ Commit 完成！

[... 其他群組 ...]

============================================================
✅ 完成！成功提交 3/3 個群組
============================================================

📋 最近的 commits:
abc1234 feat: 新增 SlidePanel 滑入面板元件
def5678 feat: 新增 Button 基礎元件
ghi9012 chore: 優化 AI 自動化腳本
```

**優勢：**

- ✅ 自動分類變更，不用手動思考要分幾個 commit
- ✅ 每個 commit 語意清晰，符合 Conventional Commits
- ✅ 節省時間，特別是累積多個功能時
- ✅ 保持 commit 歷史乾淨整潔

---

### 📤 工具 3：自動 PR (`ai:pr`) ⭐ v2.0 Enhanced

**適用時機：** 已經 commit 完成，要發 PR 到 GitHub

**🎉 v2.0 新功能**:

- ✅ 模組化架構（11 個模組，主檔案僅 62 行）
- ✅ 自動 Label 標記（根據 PR 類型和風險等級）
- ✅ 配置檔支援（`.ai-pr-config.mjs`）
- ✅ 改善的錯誤處理（友善的錯誤訊息和解決建議）

**使用步驟：**

```bash
# 基本使用（推薦）
npm run ai:pr

# 手動指定 release 分支
node scripts/ai-auto-pr.mjs --base release-2026-m.2

# 新功能：自動添加 Labels
node scripts/ai-auto-pr.mjs --auto-labels

# 新功能：使用配置檔
# 1. 創建 .ai-pr-config.mjs（專案根目錄）
# 2. 執行 npm run ai:pr
```

**執行流程：**

```
自動偵測所有 release 分支
    ↓
選擇最新的 release 分支（或使用指定的）
    ↓
推送當前分支到遠端
    ↓
AI 分析所有 commits 和 diff
    ↓
生成 PR 標題和詳細描述
    ↓
使用 gh CLI 創建 PR
    ↓
完成！
```

**Release 分支命名規則：**

- 格式：`release-YYYY-m.M` 或 `release-YYYY-w.W`
- 範例：`release-2026-m.2`（2026 年 2 月）
- 範例：`release-2026-w.5`（2026 年第 5 週）

**輸出範例：**

```
📊 自動偵測 release 分支中...
✅ 找到 12 個 release 分支
📌 使用最新分支: release-2026-m.2

📤 推送分支: feat/16742 → origin/feat/16742
🤖 正在使用 AI 生成 PR 內容...

✅ 生成的 PR 內容:
════════════════════════════════════════════════════════════
標題: feat: 新增店家和 POS 管理功能
────────────────────────────────────────────────────────────
## 📝 變更摘要
實作店家和 POS 機台的完整 CRUD 功能，包含列表、詳情、
新增、編輯和刪除，並整合授權規則設定。

## 🎯 主要變更
- 新增店家管理頁面（列表、詳情、表單）
- 新增 POS 機台管理頁面
- 整合 SWR 進行資料快取
- 實作授權規則設定功能

## 🧪 測試建議
1. 測試店家 CRUD 功能
2. 測試 POS 機台管理
3. 驗證授權規則設定
════════════════════════════════════════════════════════════

🚀 正在創建 Pull Request...
✅ Pull Request 創建成功！
🔗 https://github.com/your-org/your-repo/pull/123
```

---

### 🔄 工具 4：完整工作流程 (`ai:workflow`)

**適用時機：** 想要 commit + PR 一次完成

**使用步驟：**

```bash
npm run ai:workflow
```

**互動流程：**

```
🚀 AI 輔助工作流程啟動

📊 檢查工作區狀態...
工作區變更:
 M src/components/Button.jsx
 M src/pages/index.jsx

是否要進行 commit？(y/n): y

⚠️  沒有 staged 的變更
是否要自動 stage 所有變更？(y/n): y
✅ 已 stage 所有變更

🤖 正在使用 AI 生成 commit message...

✅ 建議的 Commit Message:
────────────────────────────────────────────────────────────
feat: 優化首頁和按鈕元件
────────────────────────────────────────────────────────────

是否使用此 commit message？(y/n/edit): y
✅ Commit 完成！

是否要創建 Pull Request？(y/n): y
...
```

---

## 💡 使用範例

### 範例 1：單一功能快速 Commit

**情境：** 修改了一個元件，想快速 commit

```bash
# 1. 修改檔案
vim src/components/Button.jsx

# 2. Stage 變更
git add src/components/Button.jsx

# 3. 自動 commit
npm run ai:commit
```

---

### 範例 2：多功能自動分類 Commit ⭐

**情境：** 今天開發了多個功能，累積了 10+ 個檔案變更

```bash
# 不需要 git add，直接執行
npm run ai:commit:all
```

**AI 會自動分類成：**

- `feat: 新增使用者登入功能` (3 個檔案)
- `feat: 新增商品列表頁面` (4 個檔案)
- `fix: 修正導航列樣式問題` (2 個檔案)
- `chore: 更新 ESLint 配置` (1 個檔案)

---

### 範例 3：發 PR 到最新 Release

**情境：** 功能開發完成，要發 PR

```bash
# 自動偵測並使用最新的 release 分支
npm run ai:pr
```

---

### 範例 4：完整開發流程

```bash
# 1. 創建 feature 分支
git checkout -b feat/user-profile

# 2. 開發功能...（修改多個檔案）

# 3. 自動分類 commit
npm run ai:commit:all

# 4. 發 PR
npm run ai:pr
```

---

## 🎨 生成的格式

### Commit Message 格式

遵循 **Conventional Commits** 規範：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 類型：**

- `feat`: 新功能
- `fix`: 修復 bug
- `docs`: 文件變更
- `style`: 格式調整（不影響程式碼邏輯）
- `refactor`: 重構
- `perf`: 效能優化
- `test`: 測試相關
- `chore`: 建置工具或輔助工具變更

**範例：**

```
feat(auth): 新增使用者登入功能

- 實作 JWT 驗證
- 新增登入頁面
- 整合 OAuth 2.0

Closes #123
```

### PR 描述格式

```markdown
## 📝 變更摘要

簡短描述這個 PR 的主要目的

## 🎯 主要變更

- 變更 1
- 變更 2
- 變更 3

## 🧪 測試建議

1. 測試步驟 1
2. 測試步驟 2

## 📋 相關 Issue

- Closes #123
- Related to #456
```

---

## 🔧 進階技巧

### 自訂 Commit Message

如果你對 AI 生成的 message 不滿意：

```bash
# 執行 ai:commit 後可以用 --amend 修改
git commit --amend
```

### 批量處理多個功能

```bash
# 使用智能批量 commit
npm run ai:commit:all

# AI 會自動分組，例如：
# Group 1: 新增登入功能 (3個檔案)
# Group 2: 優化 UI 樣式 (5個檔案)
# Group 3: 修正 API 問題 (2個檔案)
```

### 指定不同的 Base 分支

```bash
# 發到 main
node scripts/ai-auto-pr.mjs --base main

# 發到特定 release
node scripts/ai-auto-pr.mjs --base release-2026-m.3

# 發到開發分支
node scripts/ai-auto-pr.mjs --base develop
```

---
