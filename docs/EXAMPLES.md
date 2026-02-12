# Quick Start Examples

## Example 1: Single Commit

\`\`\`bash
# Stage your changes
git add src/components/Button.jsx

# Generate and commit
npx gitai commit

# Output:
# ✅ 生成的 Commit Message:
# feat(ui): 新增 Button 元件的 loading 狀態
# 
# - 新增 isLoading prop
# - 顯示 spinner 圖示
# - 禁用點擊互動
\`\`\`

## Example 2: Batch Commits

\`\`\`bash
# Multiple files modified
# - src/components/LoginForm.jsx
# - src/components/RegisterForm.jsx
# - src/api/auth.js
# - src/utils/validation.js

npx gitai commit-all

# AI groups them into:
# Group 1: feat(auth): 新增使用者認證功能
# - LoginForm.jsx, RegisterForm.jsx, auth.js
# 
# Group 2: refactor(utils): 優化驗證工具函數
# - validation.js
\`\`\`

## Example 3: Create PR

\`\`\`bash
npx gitai pr --auto-reviewers --auto-labels

# Output:
# 📝 PR 標題: feat: 新增使用者認證系統
# 
# ## 📝 變更摘要
# 實作完整的使用者認證系統，包含登入、註冊功能
# 
# ## ✨ 主要功能
# - 新增登入表單
# - 新增註冊表單
# - 實作 JWT 認證
# 
# Reviewers: alice@example.com, bob@example.com
# Labels: enhancement, auth
\`\`\`

## Example 4: Complete Workflow

\`\`\`bash
# Do all your work...
# Then:

npx gitai workflow

# This will:
# 1. Analyze all changes
# 2. Group and commit them
# 3. Generate PR
# 4. Add reviewers and labels
# 5. Create the PR
\`\`\`

## Example 5: Using Config File

\`\`\`bash
# Initialize config
npx gitai init

# Edit .ai-git-config.js
# Change AI model, enable auto-reviewers, etc.

# Now all commands use your config
npx gitai commit
npx gitai pr
\`\`\`
