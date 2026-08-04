/**
 * PR Content Prompt 生成
 * 集中管理 PR 標題、描述與影響分析的 AI prompt
 */

import { CONSTANTS } from '../../utils/constants.js';
import { getSkillsSummaryForPrompt, PROJECT_SKILLS_CONTEXT } from '../../utils/project-skills.js';

/**
 * 生成 PR 內容 prompt
 * @param {string} commits - commit 訊息
 * @param {string} diff - 程式碼變更 diff
 * @returns {string}
 */
export function generatePRContentPrompt(commits, diff) {
  return `你是一個專業的前端工程師，熟悉 Next.js、React 效能優化和團隊開發規範。
請根據以下 commit 訊息和程式碼變更，直接輸出一個清晰的 Pull Request 標題和描述。

**重要原則**：
- 只根據實際的 commit 訊息和 diff 內容描述變更，不要臆測或誇大
- 如果 commit 中沒有提到「新增指令 / 新增 API / 新增組件」，請不要用這些詞
- 文件（如 .github/copilot-instructions.md、prompt 檔案、README）應描述為「新增/更新文件」而非「新增指令」
- 如果 OpenSpec prompt 被刪除並改為 OpsX prompt，請描述為「以 OpsX 取代 OpenSpec」，不要說「新增 OpenSpec prompt」
- package.json 若只有版本號變更，請描述為「更新版本號」，不要說「更新相依」
- 重構相關的改動請優先使用 refactor 類型

**輸出格式**（不要加任何引導語，直接輸出以下內容）：

# [type]: [PR 標題]

> type 必須是以下之一：feat / fix / refactor / style / docs / test / chore / perf
> **重要**：如果有新增任何功能、新增檔案、新增 API、新增組件，優先使用 **feat**

## 📝 變更摘要
[簡述這個 PR 的主要目的和影響範圍，2-3 句話]

## 🎯 主要變更
- [變更項目 1]
- [變更項目 2]
- [變更項目 3]

## 🔀 變更類型
- [ ] ✨ 新功能 (feat)
- [ ] 🐛 Bug 修復 (fix)
- [ ] ♻️ 重構 (refactor)
- [ ] 💄 樣式調整 (style)
- [ ] 📝 文件更新 (docs)
- [ ] ⚡ 效能改進 (perf)
- [ ] 🔧 其他 (chore)

> 根據 diff 和 commit 自動勾選（可複選），[ ] 改為 [x]；有新增檔案或功能必勾 ✨ feat

## 🧪 測試方法
1. [具體的測試步驟 1]
2. [具體的測試步驟 2]
3. [具體的測試步驟 3]

## 💥 Breaking Changes
[如果有破壞性變更請詳細說明，沒有則填寫「無」]

## 📌 注意事項
[需要特別注意的事項]

## 📸 截圖
[如果是 UI 變更，提醒需要截圖]

---

## ⚠️ 風險與注意事項
**Risk Level**: \`LOW\` / \`MEDIUM\` / \`HIGH\`

[說明潛在風險、破壞性變更（breaking changes）、需要特別小心的地方；沒有則填「無」]

## 👀 Reviewer 重點
- [請 reviewer 特別關注的邏輯或設計決策 1]
- [請 reviewer 特別關注的邏輯或設計決策 2]

---

**規則**：
- 直接輸出 # [type]: [標題]，繁體中文（台灣正體）
- type 必須符合 Conventional Commits；以 commit 內容為準，新增檔案/功能優先 feat，重構優先 refactor
- 變更類型只勾選實際出現的類型，沒有 fix 類 commit 就不要勾 Bug 修復
- Risk Level：HIGH=核心流程，MEDIUM=影響現有功能，LOW=新增或純重構
- Reviewer 重點列 1-3 個值得仔細看的地方
- 描述必須和 commit 訊息一致，禁止虛構功能或誇大影響範圍

---

**Commit 訊息**：
${commits}

**程式碼變更**：
${diff}`;
}

/**
 * 生成影響分析 prompt
 * @param {string[]} changedFiles - 變更檔案列表
 * @param {string} diff - 程式碼變更 diff
 * @param {string} commits - commit 訊息
 * @returns {string}
 */
export function generateImpactAnalysisPrompt(changedFiles, diff, commits) {
  const skillsSummary = getSkillsSummaryForPrompt(PROJECT_SKILLS_CONTEXT);

  return `你是一個資深的程式碼審查專家，精通 React/Next.js 效能優化與前端架構設計。
請分析以下程式碼變更，提供專業的影響範圍分析與規範合規檢查。

${skillsSummary}

**變更檔案列表**：
${changedFiles.slice(0, CONSTANTS.MAX_FILES_IN_PROMPT).join('\n')}
${
  changedFiles.length > CONSTANTS.MAX_FILES_IN_PROMPT
    ? `... 還有 ${changedFiles.length - CONSTANTS.MAX_FILES_IN_PROMPT} 個檔案`
    : ''
}

**Commit 訊息**：
${commits.split('\n').slice(0, CONSTANTS.MAX_COMMITS_IN_PROMPT).join('\n')}

**程式碼變更內容**：
\`\`\`diff
${diff.substring(0, CONSTANTS.MAX_DIFF_LENGTH)}
${diff.length > CONSTANTS.MAX_DIFF_LENGTH ? '\n... (內容過長已截斷)' : ''}
\`\`\`

---

請以 JSON 格式輸出分析結果（不要加任何其他文字，只輸出 JSON）：

\`\`\`json
{
  "blastRadius": {
    "modules": ["影響的模組1", "影響的模組2"],
    "impacts": ["影響層面1", "影響層面2"],
    "riskLevel": "低|中|高",
    "riskReasons": ["風險原因1", "風險原因2"],
    "externalBehaviors": ["對外行為變更說明"]
  },
  "warnings": [
    {
      "level": "⚠️|ℹ️",
      "message": "問題描述",
      "suggestion": "改善建議"
    }
  ]
}
\`\`\``;
}
