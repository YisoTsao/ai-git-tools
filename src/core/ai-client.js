/**
 * AI 客戶端
 * 基於 @github/copilot-sdk
 */

import { CopilotClient, approveAll } from '@github/copilot-sdk';
import { toTraditionalChinese } from '../utils/traditional-chinese.js';

function extractJsonCandidates(content) {
  const candidates = [];

  for (let start = 0; start < content.length; start += 1) {
    if (content[start] !== '{' && content[start] !== '[') continue;

    const expectedClosers = [];
    let inString = false;
    let escaped = false;

    for (let index = start; index < content.length; index += 1) {
      const character = content[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }

      if (character === '"') {
        inString = true;
      } else if (character === '{') {
        expectedClosers.push('}');
      } else if (character === '[') {
        expectedClosers.push(']');
      } else if (character === '}' || character === ']') {
        if (expectedClosers.pop() !== character) break;
        if (expectedClosers.length === 0) {
          candidates.push(content.slice(start, index + 1));
          break;
        }
      }
    }
  }

  return candidates;
}

export class AIClient {
  /**
   * 判斷 Node.js 是否符合 Copilot SDK 的版本需求
   * @param {string} version
   * @returns {boolean}
   */
  static isSupportedNodeVersion(version = process.versions.node) {
    const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return false;

    const major = Number(match[1]);
    const minor = Number(match[2]);
    return (major === 20 && minor >= 19) || (major >= 22 && (major > 22 || minor >= 12));
  }

  /**
   * 確認 Node.js 符合 Copilot SDK 的版本需求
   */
  static assertSupportedNodeVersion() {
    if (!AIClient.isSupportedNodeVersion()) {
      throw new Error(
        `目前 Node.js ${process.versions.node} 不符合 Copilot SDK 需求。請升級至 Node.js 20.19+ 或 22.12+。`
      );
    }
  }

  /**
   * 檢測是否為 Copilot 授權相關的錯誤
   */
  static isCopilotAuthError(error) {
    const message = error?.message || error?.toString() || '';
    const lowerMessage = message.toLowerCase();

    return (
      lowerMessage.includes('permission') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('forbidden') ||
      lowerMessage.includes('not authorized') ||
      lowerMessage.includes('authentication failed') ||
      lowerMessage.includes('access denied') ||
      lowerMessage.includes('you do not have access') ||
      lowerMessage.includes('copilot') ||
      message.includes('EACCES')
    );
  }

  /**
   * 發送 prompt 並等待回應（帶重試機制和超時保護）
   */
  static async sendAndWait(prompt, model = 'gpt-5.6-luna', maxRetries = 3, timeout = 150000) {
    AIClient.assertSupportedNodeVersion();
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const client = new CopilotClient();
      try {
        const session = await client.createSession({
          model,
          onPermissionRequest: approveAll,
        });

        const response = await session.sendAndWait({ prompt }, timeout);

        const content = response?.data?.content || '';
        return toTraditionalChinese(content.trim());
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.log(`⚠️  AI 請求失敗，重試第 ${attempt}/${maxRetries} 次...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } finally {
        // 確保每次都關閉 client，無論成功或失敗
        try {
          await client.stop();
        } catch (e) {
          // 忽略關閉錯誤
        }
      }
    }

    // 區分不同類型的錯誤
    const errorObj = new Error(`AI 請求失敗: ${lastError?.message || '未知錯誤'}`);
    errorObj.originalError = lastError;
    errorObj.isCopilotAuth = AIClient.isCopilotAuthError(lastError);
    throw errorObj;
  }

  /**
   * 解析 JSON 回應
   */
  static parseJSON(content) {
    // 移除可能的 markdown code block 標記
    const jsonContent = String(content || '')
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      for (const candidate of extractJsonCandidates(jsonContent)) {
        try {
          return JSON.parse(candidate);
        } catch {
          continue;
        }
      }

      throw new Error(`無法解析 AI 回應為 JSON: ${error.message}`);
    }
  }
}
