# Installation and Testing Guide

本指南將幫助您在本地安裝和測試 AI Git Tools。

## 環境需求

- **Node.js** >= 18.0.0
- **Git** 已安裝並設定
- **GitHub CLI** (用於 PR 功能)
- **GitHub Copilot** 訂閱

## 本地開發設定

### 1. Clone 專案

\`\`\`bash
git clone https://github.com/yourusername/ai-git-tools.git
cd ai-git-tools
\`\`\`

### 2. 安裝依賴

\`\`\`bash
npm install
\`\`\`

### 3. 建立本地連結

使用 npm link 在本地測試：

\`\`\`bash
npm link
\`\`\`

現在您可以在任何地方使用 \`gitai\` 命令：

\`\`\`bash
gitai --help
\`\`\`

### 4. 測試功能

創建一個測試專案：

\`\`\`bash
mkdir test-project
cd test-project
git init
\`\`\`

初始化配置：

\`\`\`bash
gitai init
\`\`\`

創建一些測試檔案：

\`\`\`bash
echo "console.log('Hello');" > index.js
git add index.js
\`\`\`

測試 commit 功能：

\`\`\`bash
gitai commit
\`\`\`

## 發布前測試

### 1. 打包測試

\`\`\`bash
npm pack
\`\`\`

這會生成 \`ai-git-tools-1.0.0.tgz\` 檔案。

### 2. 在新環境測試

\`\`\`bash
cd /tmp
mkdir test-install
cd test-install
npm install /path/to/ai-git-tools-1.0.0.tgz
npx gitai --help
\`\`\`

### 3. 測試所有命令

\`\`\`bash
# 初始化
npx gitai init

# 創建測試變更
echo "test" > test.js
git add test.js

# 測試 commit
npx gitai commit -v

# 測試 commit-all
echo "test2" > test2.js
npx gitai commit-all -v

# 測試 PR（需要 GitHub repo）
npx gitai pr --preview
\`\`\`

## 除錯模式

啟用詳細輸出：

\`\`\`bash
gitai commit --verbose
gitai commit-all -v
\`\`\`

啟用 Node.js 除錯：

\`\`\`bash
DEBUG=* gitai commit
\`\`\`

## 常見問題

### Q: npm link 後找不到命令

A: 確認 npm 全域 bin 目錄在 PATH 中：

\`\`\`bash
npm config get prefix
# 將 <prefix>/bin 加入 PATH
\`\`\`

### Q: GitHub Copilot SDK 錯誤

A: 確認您有 GitHub Copilot 訂閱並已登入：

\`\`\`bash
gh auth status
\`\`\`

### Q: 權限錯誤

A: 確認 bin/cli.js 有執行權限：

\`\`\`bash
chmod +x bin/cli.js
\`\`\`

## 清理

取消本地連結：

\`\`\`bash
npm unlink -g ai-git-tools
\`\`\`

## 下一步

- 閱讀 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解貢獻指南
- 閱讀 [PUBLISHING.md](./PUBLISHING.md) 了解發布流程
- 查看 [EXAMPLES.md](./EXAMPLES.md) 了解使用範例
