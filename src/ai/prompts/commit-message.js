/**
 * Commit Message Prompt 生成
 * 集中管理 commit message 的 AI prompt 與後處理
 */

import { getProjectTypePrompt } from '../../utils/helpers.js';

/**
 * 生成 commit message prompt
 * @param {string} diff - git diff 內容
 * @param {Object} config - 配置物件
 * @returns {string}
 */
export function generateCommitMessagePrompt(diff, config = {}) {
  const projectPrompt = getProjectTypePrompt();

  return `${projectPrompt}

請根據以下 git diff 產生一則 commit message。

**Commit Message 規則**：
1. 使用 Conventional Commits 格式：type(scope): subject
2. type 必須是：feat/fix/docs/style/refactor/test/chore/perf 其中之一
3. scope: 影響範圍（如 member、report、auth、api、ui、config）
4. subject 限制在 50 字內，使用繁體中文
5. 如果變更複雜，加上 body 說明（使用 bullet points）

**重要**：
- 直接輸出 commit message 純文字，不要使用 markdown 程式碼區塊（\`\`\`）
- 不要加上任何前綴說明或後綴文字
- 第一行是標題，如有需要可加上空行後的詳細說明

**範例格式**：
feat(member): 新增會員管理頁面

- 實作會員列表查詢功能
- 新增會員資料編輯表單
- 整合 Zustand 狀態管理

git diff:
${diff}`;
}
