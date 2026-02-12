# Getting Started Guide

快速上手指南 - 從零開始使用 AI Git Tools

## 🎯 目標

5 分鐘內學會使用 AI Git Tools 自動化您的 Git 工作流程。

## 📚 前置知識

- 基本的 Git 操作（add, commit, push）
- 了解 Conventional Commits（可選）
- 有 GitHub Copilot 訂閱

## 🚀 第一步：安裝

選擇一種方式：

### 方式 1: NPX（推薦新手）

無需安裝，直接使用：

\`\`\`bash
npx ai-git-tools --help
\`\`\`

### 方式 2: 全域安裝（推薦常用）

\`\`\`bash
npm install -g ai-git-tools
gitai --help
\`\`\`

### 方式 3: 專案內安裝（推薦團隊）

\`\`\`bash
npm install --save-dev ai-git-tools
npx gitai --help
\`\`\`

## 📝 第二步：初始化配置

在您的專案根目錄：

\`\`\`bash
cd your-project
gitai init
\`\`\`

跟隨互動式提示完成配置。

## 🎨 第三步：第一次使用

### 場景 A：我已經 staged 了變更

\`\`\`bash
# 假設您已經做了一些變更
vim src/app.js

# Stage 變更
git add src/app.js

# 使用 AI 生成 commit
gitai commit
\`\`\`

**會發生什麼？**
1. AI 分析您的變更
2. 生成符合規範的 commit message
3. 顯示給您確認
4. 自動執行 commit

### 場景 B：我有很多變更想要一次處理

\`\`\`bash
# 假設您修改了多個檔案
vim src/auth.js
vim src/profile.js
vim src/api.js

# 不需要 git add，直接執行
gitai commit-all
\`\`\`

**會發生什麼？**
1. AI 掃描所有未提交的變更
2. 智能分組相關的變更
3. 為每組生成 commit message
4. 逐一執行 commit

### 場景 C：我要發 PR

\`\`\`bash
# 確保您在正確的分支
git checkout feature/new-login

# 生成並創建 PR
gitai pr
\`\`\`

**會發生什麼？**
1. AI 分析分支差異
2. 生成 PR 標題和描述
3. 建議 reviewers（如果啟用）
4. 添加 labels（如果啟用）
5. 創建 Pull Request

## 💡 常見問題

### Q: AI 生成的 commit message 不滿意怎麼辦？

A: 使用 `--preview` 選項先預覽，或使用 `--verbose` 查看詳細過程：

\`\`\`bash
gitai commit --verbose
\`\`\`

### Q: 可以修改 AI 生成的內容嗎？

A: 目前版本會先顯示給您確認，未來版本會支援互動式編輯。

### Q: 沒有 GitHub Copilot 可以使用嗎？

A: 目前需要 GitHub Copilot 訂閱。未來會支援其他 AI 服務。

### Q: 如何在團隊中使用？

A: 在專案內安裝，並將 `.ai-git-config.js` 加入版本控制：

\`\`\`bash
# 安裝
npm install --save-dev ai-git-tools

# 初始化配置
npx gitai init

# 提交配置檔
git add .ai-git-config.js
git commit -m "chore: add AI Git Tools config"

# 團隊成員使用
npm install
npx gitai commit
\`\`\`

## 📖 進階使用

### 自訂 AI 模型

編輯 `.ai-git-config.js`:

\`\`\`javascript
export default {
  ai: {
    model: 'claude-haiku-4.5', // 改用 Claude
  },
};
\`\`\`

### 啟用自動 Reviewer

\`\`\`javascript
export default {
  reviewers: {
    autoSelect: true, // 啟用
    maxSuggested: 5,
  },
};
\`\`\`

### 調整 Diff 長度

如果專案變更很大：

\`\`\`javascript
export default {
  ai: {
    maxDiffLength: 12000, // 增加到 12000
  },
};
\`\`\`

## 🎓 最佳實踐

### 1. 定期使用 commit-all

不要累積太多變更：

\`\`\`bash
# 每天結束前
gitai commit-all
\`\`\`

### 2. 使用 workflow 加速

完成功能開發後：

\`\`\`bash
gitai workflow --auto-reviewers --auto-labels
\`\`\`

### 3. 啟用 verbose 模式學習

了解 AI 如何分析：

\`\`\`bash
gitai commit-all --verbose
\`\`\`

### 4. 統一團隊配置

將配置檔加入版本控制，確保團隊一致。

### 5. 善用簡寫

\`\`\`bash
gitai ca    # commit-all
gitai wf    # workflow
\`\`\`

## 🔧 疑難排解

### 問題：找不到 gitai 命令

\`\`\`bash
# 使用 npx
npx gitai --help

# 或檢查安裝
npm list -g ai-git-tools
\`\`\`

### 問題：AI 請求失敗

\`\`\`bash
# 檢查 GitHub Copilot
gh copilot status

# 或嘗試其他模型
gitai commit --model claude-haiku-4.5
\`\`\`

### 問題：沒有 staged 變更

\`\`\`bash
# 使用 commit-all 代替
gitai commit-all
\`\`\`

## 📚 下一步

- 閱讀 [完整文檔](./README.md)
- 查看 [使用範例](./EXAMPLES.md)
- 參考 [快速參考](./QUICK_REFERENCE.md)
- 了解 [疑難排解](./TROUBLESHOOTING.md)

## 💬 需要幫助？

- [GitHub Issues](https://github.com/yourusername/ai-git-tools/issues)
- [Discussions](https://github.com/yourusername/ai-git-tools/discussions)

---

**恭喜！您已經掌握了 AI Git Tools 的基本使用** 🎉

現在開始享受自動化的 Git 工作流程吧！
