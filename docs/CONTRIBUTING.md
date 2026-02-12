# Contributing to AI Git Tools

感謝您對 AI Git Tools 的興趣！我們歡迎所有形式的貢獻。

## 如何貢獻

### 報告 Bug

如果您發現 bug，請[提交 Issue](https://github.com/yourusername/ai-git-tools/issues)並包含：

- 詳細的問題描述
- 重現步驟
- 預期行為
- 實際行為
- 環境資訊（Node.js 版本、OS 等）

### 提出新功能

如果您有新功能的想法：

1. 先[搜尋現有 Issues](https://github.com/yourusername/ai-git-tools/issues)
2. 如果沒有類似的提案，請創建新的 Issue
3. 詳細描述功能和使用場景

### 提交 Pull Request

1. Fork 此倉庫
2. 創建您的功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的變更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### Commit Message 規範

請遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

\`\`\`
type(scope): subject

body
\`\`\`

類型：
- \`feat\`: 新功能
- \`fix\`: Bug 修正
- \`docs\`: 文件更新
- \`style\`: 程式碼格式
- \`refactor\`: 重構
- \`test\`: 測試
- \`chore\`: 雜項

### 程式碼風格

- 使用 ESLint 和 Prettier
- 執行 \`npm run lint\` 檢查
- 執行 \`npm run format\` 格式化

## 開發設定

\`\`\`bash
# Clone 倉庫
git clone https://github.com/yourusername/ai-git-tools.git
cd ai-git-tools

# 安裝依賴
npm install

# 本地測試
npm link
gitai --help
\`\`\`

## 問題討論

如有任何問題，歡迎在 [Discussions](https://github.com/yourusername/ai-git-tools/discussions) 中討論。

## 行為準則

請保持尊重和友善的態度。

謝謝您的貢獻！🎉
