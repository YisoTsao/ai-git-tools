# Publishing Guide

發布 AI Git Tools 到 npm registry 的步驟指南。

## 發布前檢查清單

- [ ] 更新版本號（package.json）
- [ ] 更新 CHANGELOG.md
- [ ] 測試所有功能
- [ ] 檢查文檔是否完整
- [ ] 確認 LICENSE 正確
- [ ] 更新 README.md

## 發布步驟

### 1. 準備發布

\`\`\`bash
# 確保在 main 分支
git checkout main
git pull origin main

# 確保沒有未提交的變更
git status

# 安裝依賴
npm install

# 執行測試（如果有）
npm test
\`\`\`

### 2. 更新版本

使用 npm version 指令：

\`\`\`bash
# Patch 版本 (1.0.0 -> 1.0.1)
npm version patch

# Minor 版本 (1.0.0 -> 1.1.0)
npm version minor

# Major 版本 (1.0.0 -> 2.0.0)
npm version major
\`\`\`

這會自動：
- 更新 package.json 的版本號
- 創建 git tag
- 創建 git commit

### 3. 更新 CHANGELOG

編輯 CHANGELOG.md，添加新版本的變更記錄。

\`\`\`bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v1.0.1"
\`\`\`

### 4. 推送到 GitHub

\`\`\`bash
# 推送 commits 和 tags
git push origin main
git push origin --tags
\`\`\`

### 5. 發布到 npm

\`\`\`bash
# 登入 npm（如果還沒登入）
npm login

# 發布（公開套件）
npm publish --access public

# 或發布 scoped package
npm publish --access public
\`\`\`

### 6. 驗證發布

\`\`\`bash
# 在新目錄測試安裝
cd /tmp
npx ai-git-tools --version
\`\`\`

## 發布 Beta 版本

如果要發布測試版本：

\`\`\`bash
# 更新版本為 beta
npm version 1.1.0-beta.0

# 發布到 beta tag
npm publish --tag beta

# 安裝 beta 版本
npm install -g ai-git-tools@beta
\`\`\`

## 撤回發布

如果需要撤回某個版本：

\`\`\`bash
# 撤回特定版本（72小時內）
npm unpublish ai-git-tools@1.0.1

# 或使用 deprecate（推薦）
npm deprecate ai-git-tools@1.0.1 "This version has critical bugs, please upgrade to 1.0.2"
\`\`\`

## 自動化發布

可以使用 GitHub Actions 自動化發布流程：

1. 創建 `.github/workflows/publish.yml`
2. 設定 npm token 到 GitHub Secrets
3. 推送 tag 時自動發布

範例 workflow：

\`\`\`yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
\`\`\`

## 注意事項

1. **版本號規範**：遵循 [Semantic Versioning](https://semver.org/)
2. **測試**：發布前務必測試
3. **文檔**：確保 README 和 CHANGELOG 都是最新的
4. **授權**：確認 LICENSE 檔案正確
5. **.npmignore**：確保不會發布不必要的檔案

## 需要幫助？

- [npm 發布文檔](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [npm version 指令](https://docs.npmjs.com/cli/v8/commands/npm-version)
