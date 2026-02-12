# Troubleshooting Guide

常見問題解決方案

## 安裝問題

### 問題: npm install 失敗

**解決方案：**

\`\`\`bash
# 清除 npm cache
npm cache clean --force

# 刪除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安裝
npm install
\`\`\`

### 問題: 找不到 gitai 命令

**解決方案：**

\`\`\`bash
# 確認 npm 全域路徑
npm config get prefix

# 確認路徑在 PATH 中
echo $PATH

# 或使用 npx
npx gitai --help
\`\`\`

## GitHub Copilot 問題

### 問題: AI 請求失敗

**可能原因：**
1. 沒有 GitHub Copilot 訂閱
2. 網路連線問題
3. API 限制

**解決方案：**

\`\`\`bash
# 檢查 GitHub Copilot 狀態
gh copilot status

# 嘗試重新登入
gh auth logout
gh auth login

# 使用不同的 AI 模型
gitai commit --model claude-haiku-4.5
\`\`\`

### 問題: AI 回應格式錯誤

**解決方案：**

增加重試次數或調整 diff 長度：

\`\`\`bash
gitai commit --max-retries 5 --max-diff 4000
\`\`\`

## Git 問題

### 問題: 沒有 staged 變更

**錯誤訊息：**
\`\`\`
❌ 沒有 staged 的變更
\`\`\`

**解決方案：**

\`\`\`bash
# 先 stage 變更
git add <files>

# 或使用 commit-all
gitai commit-all
\`\`\`

### 問題: Git 倉庫未初始化

**錯誤訊息：**
\`\`\`
❌ 當前目錄不是 Git 倉庫
\`\`\`

**解決方案：**

\`\`\`bash
git init
\`\`\`

## GitHub CLI 問題

### 問題: GitHub CLI 未安裝

**錯誤訊息：**
\`\`\`
❌ GitHub CLI 未安裝或未認證
\`\`\`

**解決方案：**

\`\`\`bash
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
# 參考: https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# 認證
gh auth login
\`\`\`

### 問題: 創建 PR 失敗

**可能原因：**
1. 權限不足
2. 分支不存在
3. PR 已存在

**解決方案：**

\`\`\`bash
# 檢查權限
gh auth status

# 預覽 PR（不創建）
gitai pr --preview

# 手動指定分支
gitai pr --base main --head feature-branch
\`\`\`

## 配置問題

### 問題: 配置檔載入失敗

**解決方案：**

\`\`\`bash
# 檢查配置檔語法
node -c .ai-git-config.js

# 重新初始化
gitai init
\`\`\`

### 問題: 配置未生效

**解決方案：**

確認配置檔名稱正確：
- \`.ai-git-config.js\`
- \`.ai-git-config.mjs\`
- \`ai-git.config.js\`
- \`ai-git.config.mjs\`

確認配置檔在專案根目錄。

## 效能問題

### 問題: AI 分析太慢

**解決方案：**

\`\`\`bash
# 減少 diff 長度
gitai commit --max-diff 4000

# 減少 Git 歷史深度
# 編輯 .ai-git-config.js
reviewers: {
  gitHistoryDepth: 10, // 從 20 改為 10
}
\`\`\`

### 問題: commit-all 處理檔案太多

**解決方案：**

先 stage 部分檔案：

\`\`\`bash
git add src/feature1/
gitai commit

git add src/feature2/
gitai commit
\`\`\`

## 編碼問題

### 問題: Commit message 中文亂碼

**解決方案：**

\`\`\`bash
# 設定 Git 編碼
git config --global core.quotepath false
git config --global gui.encoding utf-8
git config --global i18n.commit.encoding utf-8
git config --global i18n.logoutputencoding utf-8
\`\`\`

## 其他問題

### 問題: Node.js 版本太舊

**錯誤訊息：**
\`\`\`
engine "node" is incompatible
\`\`\`

**解決方案：**

\`\`\`bash
# 檢查版本
node --version

# 升級到 Node.js 18+
# 使用 nvm
nvm install 18
nvm use 18

# 或從官網下載
# https://nodejs.org/
\`\`\`

### 問題: 權限錯誤

**錯誤訊息：**
\`\`\`
EACCES: permission denied
\`\`\`

**解決方案：**

\`\`\`bash
# 不要使用 sudo npm install -g
# 改用 npx 或設定 npm prefix

# 設定 npm prefix
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# 加入 PATH (加到 ~/.bashrc 或 ~/.zshrc)
export PATH=~/.npm-global/bin:$PATH
\`\`\`

## 取得幫助

如果以上方法都無法解決您的問題：

1. 啟用 verbose 模式查看詳細資訊：
   \`\`\`bash
   gitai commit --verbose
   \`\`\`

2. 查看 [Issues](https://github.com/yourusername/ai-git-tools/issues)

3. 提交新的 Issue，包含：
   - 錯誤訊息
   - 重現步驟
   - 環境資訊（Node.js 版本、OS、Git 版本）
   - verbose 模式的完整輸出

4. 加入 [Discussions](https://github.com/yourusername/ai-git-tools/discussions)
