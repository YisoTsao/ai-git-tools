import { CopilotClient, approveAll } from '@github/copilot-sdk';
import { CONSTANTS, PROJECT_SKILLS_CONTEXT } from '../utils/constants.js';
import { getSkillsSummaryForPrompt, log } from '../utils/helpers.js';

// CopilotClient 子程序啟動 + AI 模型回應可能共需 60-120s，設為 150s 保留足夠緩衝
const AI_TIMEOUT_MS = 150000;

/**
 * AI 分析器 - 負責程式碼分析和 PR 內容生成
 */
export class AIAnalyzer {
  constructor(config = {}) {
    this.model = config.model || 'gpt-4.1';
    this._client = null; // 複用同一個 CopilotClient，避免重複啟動子程序
  }

  /**
   * 取得（或建立）共用的 CopilotClient
   */
  async _getOrCreateClient() {
    if (!this._client) {
      this._client = new CopilotClient();
    }
    return this._client;
  }

  /**
   * 建立 AI Session（複用已有的 client）
   */
  async _createSession() {
    const client = await this._getOrCreateClient();
    return client.createSession({
      model: this.model,
      onPermissionRequest: approveAll,
    });
  }

  /**
   * 釋放 CopilotClient 子程序資源
   */
  async close() {
    if (this._client) {
      try {
        await this._client.stop();
      } catch (e) {
        // 忽略關閉錯誤
      } finally {
        this._client = null;
      }
    }
  }

  /**
   * 生成 PR 內容
   */
  async generatePRContent(commits, diff) {
    const skillsSummary = getSkillsSummaryForPrompt(PROJECT_SKILLS_CONTEXT);
    const prompt = this.buildPRPrompt(commits, diff, skillsSummary);

    const session = await this._createSession();

    // 使用超時保護（150 秒，含子程序啟動 + AI 回應）
    const responsePromise = session.sendAndWait({ prompt });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`AI 請求超時 (${AI_TIMEOUT_MS / 1000} 秒)`)), AI_TIMEOUT_MS);
    });

    const response = await Promise.race([responsePromise, timeoutPromise]);
    const prContent = response?.data.content?.trim() || '';

    if (!prContent) {
      throw new Error('AI 未能生成 PR 內容');
    }

    return this.parsePRContent(prContent);
    // 注意：不在此 stop() client，改由 close() 統一清理以便複用
  }

  /**
   * 分析程式碼影響範圍
   */
  async analyzeImpact(changedFiles, diff, commits) {
    const skillsSummary = getSkillsSummaryForPrompt(PROJECT_SKILLS_CONTEXT);
    const prompt = this.buildAnalysisPrompt(changedFiles, diff, commits, skillsSummary);

    const session = await this._createSession();

    try {
      log.info('  正在使用 AI 深度分析程式碼變更...');

      // 使用超時保護（150 秒）
      const responsePromise = session.sendAndWait({ prompt });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`AI 請求超時 (${AI_TIMEOUT_MS / 1000} 秒)`)), AI_TIMEOUT_MS);
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const content = response?.data.content?.trim() || '';

      // 解析 JSON
      try {
        const jsonMatch =
          content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        const analysisResult = JSON.parse(jsonStr);

        const blastRadius = {
          modules: analysisResult.blastRadius?.modules || [],
          impacts: analysisResult.blastRadius?.impacts || [],
          riskLevel: analysisResult.blastRadius?.riskLevel || '低',
          riskReasons: analysisResult.blastRadius?.riskReasons || [],
          externalBehaviors: analysisResult.blastRadius?.externalBehaviors || [],
        };

        const warnings = analysisResult.warnings || [];

        log.success('  AI 分析完成\n');
        return { blastRadius, warnings };
      } catch (parseError) {
        log.warning('  AI 響應解析失敗，使用基礎分析...');
        return this.getFallbackAnalysis(changedFiles);
      }
    } catch (error) {
      log.warning(`  AI 分析失敗 (${error.message})，使用基礎分析...\n`);
      return this.getFallbackAnalysis(changedFiles);
    }
    // 注意：不在此 stop() client，改由 close() 統一清理以便複用
  }

  /**
   * 建立 PR 生成 Prompt
   */
  buildPRPrompt(commits, diff, skillsSummary) {
    return `你是一個專業的前端工程師，熟悉 Next.js、React 效能優化和團隊開發規範。
請根據以下 commit 訊息和程式碼變更，直接輸出一個清晰的 Pull Request 標題和描述。

${skillsSummary}

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

> **重要**: 請仔細分析 diff 和 commit 訊息，**自動勾選**對應的類型（可複選），將 [ ] 改為 [x]
> 
> **判斷準則**：
> - ✨ **新功能 (feat)**: 新增檔案、新增 API、新增組件、新增功能邏輯、新增配置選項
> - 🐛 **Bug 修復 (fix)**: 修復錯誤、修正邏輯問題
> - ♻️ **重構 (refactor)**: 重組程式碼結構但不改變功能
> - 💄 **樣式調整 (style)**: UI/CSS 調整、格式化
> - 📝 **文件更新 (docs)**: README、註解、文檔變更
> - ⚡ **效能改進 (perf)**: 優化效能
> - 🔧 **其他 (chore)**: 建構工具、依賴更新、配置調整
> 
> **特別注意**: 如果 diff 中有「新增檔案」或「新增功能」，**務必勾選** ✨ 新功能 (feat)

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

## ✅ 已套用規則總結

> 請根據上方提供的專案規範（React Best Practices 和 Frontend Guidelines），分析本次程式碼變更

### React Best Practices 規則

**✅ 已正確套用的規則**：
[列出本次變更中有正確使用的規則]

**❌ 需要改善的項目**：
[列出本次變更中違反的規則]

### Frontend Guidelines

[根據程式碼實際內容檢查相關項目]

---

**規則**：
1. PR 標題格式：type: 簡短描述（不超過 50 字）
2. type 必須符合 Conventional Commits
3. 變更摘要用 2-3 句話概括整體影響
4. 全部使用繁體中文（台灣正體）
5. 不要在開頭加引導語句
6. 直接開始輸出 # [type]: [標題]
7. **變更類型判斷必須準確**：
   - 檢查 diff 中是否有 "new file mode" 或大量 "+++" 行（表示新增檔案）
   - 檢查 commit 訊息是否包含「新增」、「add」、「feat」等關鍵字
   - 檢查主要變更列表，如果提到「新增 xxx」就必須勾選 ✨ 新功能 (feat)
   - 新增配置檔、新增組件、新增 API、新增功能都算 feat
   - 一個 PR 可以同時是多種類型（如：feat + refactor + chore）

---

**Commit 訊息**：
${commits}

**程式碼變更**：
${diff}`;
  }

  /**
   * 建立影響分析 Prompt
   */
  buildAnalysisPrompt(changedFiles, diff, commits, skillsSummary) {
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
\`\`\`

**分析重點**：

1. **影響範圍 (blastRadius)**：
   - 真實分析程式碼變更內容，不要只看檔案路徑
   - 識別實際影響的模組
   - 分析影響層面（API、資料庫、UI、商業邏輯、效能、安全性等）
   - 評估風險等級，並說明原因
   - 識別對外行為變更

2. **規範警告 (warnings)**：
   - 檢查是否有安全風險
   - 檢查是否缺少錯誤處理
   - 檢查是否有效能問題
   - 檢查是否違反最佳實踐

**回應格式**：只輸出有效的 JSON，不要有任何前綴或後綴文字。`;
  }

  /**
   * 解析 AI 生成的 PR 內容
   */
  parsePRContent(prContent) {
    let title = '';
    let body = '';

    const lines = prContent.split('\n');
    let titleLineIndex = -1;

    // 尋找第一個 # 開頭的標題行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳過引導語句
      if (
        line.match(/^(已根據|請|這是|以下是|根據|PR\s*描述|該描述)/i) ||
        line.match(/適合.*複製/i)
      ) {
        continue;
      }

      // 找到第一個 # 標題
      if (line.match(/^#\s+.+/)) {
        titleLineIndex = i;
        title = line.replace(/^#\s+/, '').trim();
        break;
      }
    }

    // Body 從標題後一行開始
    if (titleLineIndex >= 0) {
      let bodyStartIndex = titleLineIndex + 1;
      while (bodyStartIndex < lines.length && !lines[bodyStartIndex].trim()) {
        bodyStartIndex++;
      }
      body = lines.slice(bodyStartIndex).join('\n').trim();
    } else {
      body = prContent.trim();
    }

    // 清理標題和 body
    title = title.replace(/[（(]\d+字[）)]/g, '').trim();
    body = body.replace(/\n*該描述使用.*$/i, '').trim();

    return { title, body };
  }

  /**
   * 降級方案：基礎分析
   */
  getFallbackAnalysis(changedFiles) {
    const modules = [];
    const impacts = [];
    let riskLevel = '低';
    const riskReasons = [];

    changedFiles.forEach((file) => {
      const lower = file.toLowerCase();
      if (lower.includes('/api/')) {
        if (!impacts.includes('API 層')) impacts.push('API 層');
        if (!modules.includes('API 服務')) modules.push('API 服務');
      }
      if (lower.includes('/components/') || lower.includes('/pages/')) {
        if (!impacts.includes('使用者介面')) impacts.push('使用者介面');
        if (!modules.includes('前端元件')) modules.push('前端元件');
      }
      if (lower.includes('db') || lower.includes('migration') || lower.includes('schema')) {
        if (!impacts.includes('資料庫')) impacts.push('資料庫');
        riskLevel = '高';
        riskReasons.push('涉及資料庫結構變更');
      }
    });

    const warnings = [];
    const hasTestFiles = changedFiles.some((f) => f.includes('test') || f.includes('spec'));
    if (!hasTestFiles && changedFiles.length > 3) {
      warnings.push({
        level: '⚠️',
        message: '未包含測試檔案',
        suggestion: '建議新增測試確保程式碼品質',
      });
    }

    return {
      blastRadius: { modules, impacts, riskLevel, riskReasons, externalBehaviors: [] },
      warnings,
    };
  }

  /**
   * 將分析結果附加到 PR body
   */
  appendAnalysisToBody(body, blastRadius, warnings) {
    let enhancedBody = body;

    // 添加影響範圍
    enhancedBody += '\n\n---\n\n## 💥 影響範圍分析\n\n';

    if (blastRadius.modules.length > 0) {
      enhancedBody += `**影響模組**：${blastRadius.modules.join('、')}\n\n`;
    }

    if (blastRadius.impacts.length > 0) {
      enhancedBody += `**影響層面**：${blastRadius.impacts.join('、')}\n\n`;
    }

    const riskEmojiMap = { 高: '🔴', 中: '🟡', 低: '🟢' };
    const riskEmoji = riskEmojiMap[blastRadius.riskLevel] || '🟢';
    enhancedBody += `**風險等級**：${riskEmoji} ${blastRadius.riskLevel}\n\n`;

    if (blastRadius.riskReasons && blastRadius.riskReasons.length > 0) {
      enhancedBody += `**風險因素**：\n`;
      blastRadius.riskReasons.forEach((reason) => {
        enhancedBody += `- ${reason}\n`;
      });
      enhancedBody += '\n';
    }

    if (blastRadius.externalBehaviors && blastRadius.externalBehaviors.length > 0) {
      enhancedBody += `**對外行為變更**：\n`;
      blastRadius.externalBehaviors.forEach((behavior) => {
        enhancedBody += `- ${behavior}\n`;
      });
      enhancedBody += '\n';
    }

    // 添加規範警告
    if (warnings.length > 0) {
      enhancedBody += '\n## ⚠️ 注意事項\n\n';
      warnings.forEach((warning) => {
        enhancedBody += `${warning.level} **${warning.message}**\n`;
        if (warning.suggestion) {
          enhancedBody += `  - 💡 ${warning.suggestion}\n`;
        }
        enhancedBody += '\n';
      });
    }

    return enhancedBody;
  }
}
