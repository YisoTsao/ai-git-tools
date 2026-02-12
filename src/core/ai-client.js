/**
 * AI Client
 * 
 * 封裝 GitHub Copilot SDK 的 AI 客戶端
 */

import { CopilotClient } from '@github/copilot-sdk';

export class AIClient {
  constructor(config = {}) {
    this.config = config;
    this.client = null;
    this.session = null;
  }

  /**
   * 初始化客戶端
   */
  async initialize() {
    if (!this.client) {
      this.client = new CopilotClient();
    }
    return this.client;
  }

  /**
   * 創建會話
   */
  async createSession(options = {}) {
    await this.initialize();
    
    this.session = await this.client.createSession({
      model: options.model || this.config.ai?.model || 'gpt-4.1',
      ...options,
    });
    
    return this.session;
  }

  /**
   * 發送請求並等待回應（帶重試機制）
   */
  async sendAndWait(prompt, options = {}) {
    const maxRetries = options.maxRetries || this.config.ai?.maxRetries || 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.session) {
          await this.createSession(options);
        }

        const response = await this.session.sendAndWait({ prompt });
        return response?.data?.content || '';
      } catch (error) {
        lastError = error;
        
        if (this.config.output?.verbose) {
          console.log(`⚠️  嘗試 ${attempt}/${maxRetries} 失敗: ${error.message}`);
        }
        
        // 如果還有重試機會，重新創建 session
        if (attempt < maxRetries) {
          this.session = null;
          continue;
        }
      }
    }

    throw new Error(`AI 請求失敗（嘗試 ${maxRetries} 次）: ${lastError?.message || '未知錯誤'}`);
  }

  /**
   * 停止客戶端
   */
  async stop() {
    if (this.client) {
      await this.client.stop();
      this.client = null;
      this.session = null;
    }
  }

  /**
   * 清理回應內容（移除 markdown 程式碼區塊等）
   */
  static cleanResponse(response) {
    if (!response) return '';

    let cleaned = response.trim();

    // 移除 markdown 程式碼區塊標記
    cleaned = cleaned.replace(/^```[\w]*\n/gm, '');
    cleaned = cleaned.replace(/\n```$/gm, '');
    cleaned = cleaned.replace(/^```$/gm, '');

    // 移除開頭和結尾的引號
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    return cleaned.trim();
  }

  /**
   * 解析 JSON 回應
   */
  static parseJSON(response) {
    const cleaned = AIClient.cleanResponse(response);
    
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      throw new Error(`無法解析 AI 回應為 JSON: ${error.message}`);
    }
  }
}
