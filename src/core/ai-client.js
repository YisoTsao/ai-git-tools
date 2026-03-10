/**
 * AI 客戶端
 * 基於 @github/copilot-sdk
 */

import { CopilotClient, approveAll } from '@github/copilot-sdk';

export class AIClient {
  /**
   * 發送 prompt 並等待回應（帶重試機制和超時保護）
   */
  static async sendAndWait(prompt, model = 'gpt-4.1', maxRetries = 3, timeout = 60000) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const client = new CopilotClient();
      try {
        const session = await client.createSession({ 
          model,
          onPermissionRequest: approveAll
        });
        
        // 使用 Promise.race 實現超時控制
        const responsePromise = session.sendAndWait({ prompt });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`AI 請求超時 (${timeout}ms)`)), timeout);
        });

        const response = await Promise.race([responsePromise, timeoutPromise]);

        const content = response?.data?.content || '';
        return content.trim();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.log(`⚠️  AI 請求失敗，重試第 ${attempt}/${maxRetries} 次...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
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

    throw new Error(`AI 請求失敗: ${lastError?.message || '未知錯誤'}`);
  }

  /**
   * 解析 JSON 回應
   */
  static parseJSON(content) {
    // 移除可能的 markdown code block 標記
    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      throw new Error(`無法解析 AI 回應為 JSON: ${error.message}`);
    }
  }
}
