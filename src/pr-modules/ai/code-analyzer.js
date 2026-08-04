import { CopilotClient, approveAll } from '@github/copilot-sdk';
import { CONSTANTS } from '../../utils/constants.js';
import { log } from '../../utils/logger.js';
import { isCopilotAuthError } from '../../utils/helpers.js';
import {
  generatePRContentPrompt,
  generateImpactAnalysisPrompt,
} from '../../ai/prompts/pr-content.js';

// 讓 CopilotClient 啟動的 Node 子程序繼承此設定，靜音 SQLite ExperimentalWarning
process.env.NODE_NO_WARNINGS = '1';

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
   * 預熱 CopilotClient — 在 workflow 開始時盡早呼叫，
   * 讓 subprocess 在 git 操作期間並行啟動，避免 session.idle timeout
   */
  async warmup() {
    await this._getOrCreateClient();
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
   * 生成 PR 內容（失敗時自動重建 client 重試一次）
   */
  async generatePRContent(commits, diff) {
    const prompt = generatePRContentPrompt(commits, diff);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (attempt === 2) {
          log.info('  重試 AI 請求（重建 session）...\n');
          await this.close(); // 釋放舊 client，下一次 _createSession 會建新的
        }

        const session = await this._createSession();

        const responsePromise = session.sendAndWait({ prompt });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error(`AI 請求超時 (${AI_TIMEOUT_MS / 1000} 秒)`)),
            AI_TIMEOUT_MS
          );
        });

        const response = await Promise.race([responsePromise, timeoutPromise]);
        const prContent = response?.data.content?.trim() || '';

        if (!prContent) {
          throw new Error('AI 未能生成 PR 內容');
        }

        return this.parsePRContent(prContent);
      } catch (error) {
        // SDK 內部 session.idle timeout（hardcoded 60s）→ 重試一次
        const isSessionIdleTimeout =
          error.message?.includes('session.idle') || error.message?.includes('Timeout after');
        if (isSessionIdleTimeout) {
          if (attempt === 1) {
            log.warning(`  AI session 超時，即將重試...\n`);
            continue;
          }
          // 兩次都超時 → 模型速度不足，給出具體建議
          log.error(`  模型 ${this.model} 在此變更大小下回應過慢`);
          log.info(`  建議改用更快的模型：ai-git-tools pr --model gpt-5.4\n`);
          throw new Error(`AI 生成超時：模型 ${this.model} 回應過慢，請加 --model gpt-5.4 重試`);
        }

        // 檢測 Copilot 授權錯誤
        if (isCopilotAuthError(error)) {
          log.error('看起來是 GitHub Copilot 授權問題');
          log.error('  1. 確認你的 GitHub 帳號已訂閱 GitHub Copilot');
          log.error('  2. 驗證 VS Code 中使用的 GitHub 帳號是否有 Copilot 存取權限');
          log.error('  3. 嘗試重新登入: gh auth logout && gh auth login');
          throw error;
        }

        throw error;
      }
    }
    // unreachable，但保留讓 linter 滿意
    throw new Error('AI 未能生成 PR 內容');
    // 注意：不在此 stop() client，改由 close() 統一清理以便複用
  }

  /**
   * 分析程式碼影響範圍
   */
  async analyzeImpact(changedFiles, diff, commits) {
    const prompt = generateImpactAnalysisPrompt(changedFiles, diff, commits);

    const session = await this._createSession();

    try {
      log.info('  正在使用 AI 深度分析程式碼變更...');

      // 使用超時保護（150 秒）
      const responsePromise = session.sendAndWait({ prompt });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`AI 請求超時 (${AI_TIMEOUT_MS / 1000} 秒)`)),
          AI_TIMEOUT_MS
        );
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

    changedFiles.forEach(file => {
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
    const hasTestFiles = changedFiles.some(f => f.includes('test') || f.includes('spec'));
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
      blastRadius.riskReasons.forEach(reason => {
        enhancedBody += `- ${reason}\n`;
      });
      enhancedBody += '\n';
    }

    if (blastRadius.externalBehaviors && blastRadius.externalBehaviors.length > 0) {
      enhancedBody += `**對外行為變更**：\n`;
      blastRadius.externalBehaviors.forEach(behavior => {
        enhancedBody += `- ${behavior}\n`;
      });
      enhancedBody += '\n';
    }

    // 添加規範警告
    if (warnings.length > 0) {
      enhancedBody += '\n## ⚠️ 注意事項\n\n';
      warnings.forEach(warning => {
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
