# AI Git Tools - 專案總結

## 📁 專案結構

\`\`\`
ai-git-tools/
├── bin/
│   └── cli.js                    # CLI 入口點
├── src/
│   ├── commands/                 # 命令實作
│   │   ├── commit.js            # 單次 commit
│   │   ├── commit-all.js        # 批量 commit
│   │   ├── pr.js                # PR 生成
│   │   ├── workflow.js          # 完整工作流程
│   │   └── init.js              # 初始化配置
│   ├── core/                    # 核心模組
│   │   ├── ai-client.js         # AI 客戶端
│   │   ├── config-loader.js     # 配置載入器
│   │   ├── git-operations.js    # Git 操作
│   │   └── github-api.js        # GitHub API
│   ├── utils/                   # 工具函數
│   │   ├── helpers.js           # 輔助函數
│   │   └── logger.js            # 日誌工具
│   └── index.js                 # 主入口
├── templates/
│   └── .ai-git-config.template.js  # 配置檔範本
├── package.json
├── README.md
├── README.zh-TW.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── PUBLISHING.md
├── INSTALLATION.md
├── TROUBLESHOOTING.md
├── EXAMPLES.md
├── .gitignore
├── .npmignore
├── .eslintrc.json
└── .prettierrc
\`\`\`

## 🎯 核心功能

### 1. **智能 Commit** (\`gitai commit\`)
- 分析 staged 變更
- 生成符合 Conventional Commits 的 message
- 自動執行 commit

### 2. **批量提交** (\`gitai commit-all\`)
- 掃描所有未提交變更
- AI 智能分組
- 自動生成多個 commits

### 3. **自動 PR** (\`gitai pr\`)
- 分析分支差異
- 生成 PR 標題和描述
- 建議 reviewers 和 labels
- 創建 Pull Request

### 4. **完整工作流程** (\`gitai workflow\`)
- 結合 commit-all + pr
- 一鍵完成所有操作

### 5. **配置初始化** (\`gitai init\`)
- 互動式創建配置檔
- 自訂 AI 模型
- 設定 reviewers 和 labels

## 🔧 技術架構

### 依賴套件

**生產依賴：**
- \`@github/copilot-sdk\` - GitHub Copilot AI 整合
- \`commander\` - CLI 框架
- \`chalk\` - 終端機顏色輸出
- \`ora\` - Spinner 動畫
- \`inquirer\` - 互動式提示

**開發依賴：**
- \`eslint\` - 程式碼檢查
- \`prettier\` - 程式碼格式化

### 核心類別

1. **AIClient** - AI 請求處理
   - 會話管理
   - 重試機制
   - 回應清理

2. **GitOperations** - Git 命令封裝
   - 狀態檢查
   - Diff 分析
   - Commit 執行

3. **GitHubAPI** - GitHub CLI 整合
   - PR 創建
   - Label 管理
   - Reviewer 選擇

4. **Logger** - 日誌輸出
   - 彩色輸出
   - Spinner 動畫
   - 進度顯示

### 配置系統

優先權順序：
1. CLI 參數（最高）
2. 配置檔
3. 預設值（最低）

配置檔搜尋順序：
1. \`.ai-git-config.js\`
2. \`.ai-git-config.mjs\`
3. \`ai-git.config.js\`
4. \`ai-git.config.mjs\`

## 📝 開發規範

### Commit Message 格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

**Types:**
- \`feat\` - 新功能
- \`fix\` - Bug 修正
- \`docs\` - 文件
- \`style\` - 格式
- \`refactor\` - 重構
- \`test\` - 測試
- \`chore\` - 雜項

### 程式碼風格

- ESLint 規則檢查
- Prettier 格式化
- 2 空格縮排
- 單引號字串
- Trailing commas

### 版本控制

遵循 [Semantic Versioning](https://semver.org/)：

- **Major (x.0.0)** - 破壞性變更
- **Minor (0.x.0)** - 新功能（向下相容）
- **Patch (0.0.x)** - Bug 修正

## 🚀 發布流程

1. 更新版本號
2. 更新 CHANGELOG.md
3. 執行測試
4. 提交變更
5. 創建 tag
6. 推送到 GitHub
7. 發布到 npm

詳見 [PUBLISHING.md](./PUBLISHING.md)

## 🧪 測試指南

### 本地測試

\`\`\`bash
# 連結到全域
npm link

# 創建測試專案
mkdir test-project && cd test-project
git init

# 測試命令
gitai init
gitai commit
gitai commit-all
gitai pr --preview
\`\`\`

### 打包測試

\`\`\`bash
npm pack
npm install -g ai-git-tools-1.0.0.tgz
\`\`\`

## 📚 文件

- **README.md** - 主要文檔（英文）
- **README.zh-TW.md** - 繁體中文快速參考
- **CHANGELOG.md** - 版本變更記錄
- **CONTRIBUTING.md** - 貢獻指南
- **PUBLISHING.md** - 發布指南
- **INSTALLATION.md** - 安裝指南
- **TROUBLESHOOTING.md** - 疑難排解
- **EXAMPLES.md** - 使用範例

## 🔐 安全性

- 不儲存敏感資訊
- 使用臨時檔案處理 commit message
- 配置檔不包含在 npm package 中
- 遵循最小權限原則

## 🌐 國際化

目前支援：
- 繁體中文（預設）
- 英文（文檔）

未來可擴展：
- 簡體中文
- 日文
- 韓文

## 📊 效能考量

- Diff 長度限制（預設 8000 字元）
- Git 歷史深度限制（預設 20 筆）
- 檔案數量限制（commit-all 分析前 10 個檔案的貢獻者）
- AI 請求重試（預設 3 次）

## 🔄 未來規劃

### v1.1.0
- [ ] 支援更多 AI 模型（OpenAI、Anthropic）
- [ ] 自訂 commit message 範本
- [ ] 操作歷史記錄

### v1.2.0
- [ ] 互動式 commit 編輯
- [ ] PR 範本支援
- [ ] 多語言支援

### v2.0.0
- [ ] 圖形化介面（TUI）
- [ ] VS Code 擴充套件
- [ ] Team 協作功能

## 🤝 貢獻者

感謝所有貢獻者！

## 📄 授權

MIT License - 詳見 [LICENSE](./LICENSE)

## 📧 聯絡

- GitHub Issues: https://github.com/yourusername/ai-git-tools/issues
- GitHub Discussions: https://github.com/yourusername/ai-git-tools/discussions

---

**最後更新：** 2026-02-12
**版本：** 1.0.0
