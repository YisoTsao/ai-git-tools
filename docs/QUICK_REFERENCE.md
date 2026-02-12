# Quick Reference

快速參考指南 - 所有常用命令一覽

## 📦 安裝

\`\`\`bash
# NPX（無需安裝）
npx ai-git-tools init

# 全域安裝
npm install -g ai-git-tools

# 專案內安裝
npm install --save-dev ai-git-tools
\`\`\`

## 🎯 常用命令

### 初始化

\`\`\`bash
gitai init                          # 創建配置檔
\`\`\`

### Commit

\`\`\`bash
gitai commit                        # 單次 commit
gitai commit -v                     # 詳細模式
gitai commit --model claude-4.5     # 指定模型
\`\`\`

### Batch Commit

\`\`\`bash
gitai commit-all                    # 批量 commit
gitai ca                            # 簡寫
gitai ca -v                         # 詳細模式
\`\`\`

### Pull Request

\`\`\`bash
gitai pr                            # 創建 PR
gitai pr --draft                    # 草稿 PR
gitai pr --preview                  # 僅預覽
gitai pr --auto-reviewers           # 自動選擇 reviewers
gitai pr --auto-labels              # 自動添加 labels
gitai pr --base main                # 指定目標分支
\`\`\`

### Workflow

\`\`\`bash
gitai workflow                      # 完整流程
gitai wf                            # 簡寫
gitai wf --draft                    # 草稿模式
\`\`\`

## ⚙️ 常用選項

| 選項 | 說明 | 適用命令 |
|------|------|----------|
| \`-v, --verbose\` | 顯示詳細輸出 | 所有 |
| \`-m, --model <model>\` | 指定 AI 模型 | commit, pr |
| \`--max-diff <n>\` | 最大 diff 長度 | commit |
| \`--max-retries <n>\` | 最大重試次數 | commit |
| \`-b, --base <branch>\` | 目標分支 | pr |
| \`--draft\` | 創建草稿 PR | pr |
| \`--preview\` | 僅預覽不執行 | pr |
| \`--auto-reviewers\` | 自動選擇 reviewers | pr |
| \`--auto-labels\` | 自動添加 labels | pr |

## 🔧 配置檔

### 基本配置

\`\`\`javascript
export default {
  ai: {
    model: 'gpt-4.1',
    maxDiffLength: 8000,
    maxRetries: 3,
  },
  github: {
    defaultBase: 'auto',
    autoLabels: true,
  },
  reviewers: {
    autoSelect: false,
    maxSuggested: 5,
  },
  output: {
    verbose: false,
  },
};
\`\`\`

### 支援的 AI 模型

- \`gpt-4.1\` （預設）
- \`claude-haiku-4.5\`
- \`claude-sonnet-4.5\`

## 📝 Commit Types

| Type | 說明 | 範例 |
|------|------|------|
| \`feat\` | 新功能 | feat(auth): 新增登入功能 |
| \`fix\` | 錯誤修正 | fix(ui): 修正按鈕顯示問題 |
| \`docs\` | 文件變更 | docs: 更新 README |
| \`style\` | 程式碼格式 | style: 格式化程式碼 |
| \`refactor\` | 重構 | refactor(api): 重構 API 層 |
| \`test\` | 測試 | test: 新增單元測試 |
| \`chore\` | 雜項 | chore: 更新依賴 |
| \`perf\` | 效能優化 | perf: 優化查詢效能 |

## 🚀 工作流程範例

### 場景 1：日常開發

\`\`\`bash
# 做一些變更
vim src/app.js

# Stage 變更
git add src/app.js

# 自動 commit
gitai commit
\`\`\`

### 場景 2：多功能開發

\`\`\`bash
# 做多個功能的變更
vim src/auth.js src/profile.js src/api.js

# 自動分組並提交
gitai commit-all
\`\`\`

### 場景 3：發 PR

\`\`\`bash
# 完成開發後
gitai pr --auto-reviewers --auto-labels
\`\`\`

### 場景 4：一鍵完成

\`\`\`bash
# 做完所有變更後
gitai workflow
\`\`\`

## 🔍 疑難排解

### 常見錯誤

| 錯誤 | 原因 | 解決方法 |
|------|------|----------|
| 沒有 staged 變更 | 未執行 git add | \`git add <files>\` 或用 \`gitai ca\` |
| GitHub CLI 未安裝 | 缺少 gh | \`brew install gh && gh auth login\` |
| AI 請求失敗 | 網路或訂閱問題 | 檢查網路和 Copilot 訂閱 |
| 配置檔載入失敗 | 語法錯誤 | \`node -c .ai-git-config.js\` |

### 除錯命令

\`\`\`bash
gitai commit -v                     # 詳細模式
gitai commit --max-retries 5        # 增加重試
node -c .ai-git-config.js           # 檢查配置語法
\`\`\`

## 📚 相關資源

- [完整文檔](./README.md)
- [安裝指南](./INSTALLATION.md)
- [疑難排解](./TROUBLESHOOTING.md)
- [使用範例](./EXAMPLES.md)
- [貢獻指南](./CONTRIBUTING.md)

## 💡 小技巧

1. **使用簡寫**：\`gitai ca\` = \`gitai commit-all\`
2. **預覽 PR**：使用 \`--preview\` 先看效果
3. **詳細輸出**：加上 \`-v\` 了解執行過程
4. **配置檔**：放在專案根目錄自動載入
5. **NPX**：無需安裝直接用 \`npx gitai\`

## 🎓 最佳實踐

1. ✅ 使用 \`gitai init\` 初始化配置
2. ✅ 定期使用 \`gitai ca\` 整理 commits
3. ✅ PR 前用 \`--preview\` 確認內容
4. ✅ 啟用 \`--auto-reviewers\` 節省時間
5. ✅ 自訂配置檔符合團隊規範

---

**快速幫助：** \`gitai --help\`
**問題回報：** https://github.com/yourusername/ai-git-tools/issues
