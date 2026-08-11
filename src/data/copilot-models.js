/**
 * Copilot 模型本機增強資料表
 * 用來補充 Copilot SDK listModels() 回傳的動態資料
 */

const MODEL_ENHANCEMENTS = {
  'gpt-4.1': {
    description: '目前預設模型，綜合表現均衡，適合大多數任務',
    recommendedFor: ['commit', 'pr', 'analysis'],
    speed: 'medium',
    notes: '在極大 diff 的 PR 分析時可能較慢',
  },
  'gpt-5.4': {
    description: '較新的模型，適合大型 PR 與複雜分析',
    recommendedFor: ['pr', 'analysis'],
    speed: 'medium',
    notes: '大 diff 分析建議使用此模型',
  },
  'gpt-5.3-codex': {
    description: '專為程式碼理解與生成優化的模型',
    recommendedFor: ['commit', 'pr', 'analysis'],
    speed: 'medium',
    notes: '適合複雜程式碼分析與重構建議',
  },
  'claude-sonnet-4.6': {
    description: 'Claude Sonnet 4.6，平衡效能與品質',
    recommendedFor: ['pr', 'analysis'],
    speed: 'medium',
    notes: '支援 reasoning effort 調整',
  },
  'claude-sonnet-4.5': {
    description: 'Claude Sonnet 4.5，可靠且適合多數任務',
    recommendedFor: ['commit', 'pr', 'analysis'],
    speed: 'medium',
    notes: '',
  },
  'claude-haiku-4.5': {
    description: 'Claude Haiku 4.5，反應快速且成本較低',
    recommendedFor: ['commit'],
    speed: 'fast',
    notes: '適合需要快速產出的簡單任務',
  },
  'claude-opus-4.6': {
    description: 'Claude Opus 4.6，最強大的 Claude 模型',
    recommendedFor: ['pr', 'analysis'],
    speed: 'slow',
    notes: '適合極複雜的分析與大型 PR',
  },
};

/**
 * 推斷模型供應商
 * @param {string} modelId
 * @returns {string}
 */
export function inferProvider(modelId) {
  if (modelId.startsWith('claude')) return 'Anthropic';
  if (modelId.startsWith('gpt')) return 'OpenAI';
  return 'Unknown';
}

/**
 * 將 token 數格式化為可讀字串（例如 264000 → 264K）
 * @param {number} tokens
 * @returns {string}
 */
export function formatTokenCount(tokens) {
  if (!tokens && tokens !== 0) return '—';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return `${tokens}`;
}

/**
 * 取得模型的本機增強資料
 * @param {string} modelId
 * @returns {object}
 */
export function getModelEnhancement(modelId) {
  return MODEL_ENHANCEMENTS[modelId] || {
    description: 'Copilot SDK 回報的可用模型',
    recommendedFor: [],
    speed: 'medium',
    notes: '',
  };
}

/**
 * 合併 SDK 模型資料與本機增強資料
 * @param {object} sdkModel
 * @returns {object}
 */
export function enrichModel(sdkModel) {
  const enhancement = getModelEnhancement(sdkModel.id);
  const limits = sdkModel.capabilities?.limits || {};

  return {
    ...sdkModel,
    provider: inferProvider(sdkModel.id),
    description: enhancement.description,
    recommendedFor: enhancement.recommendedFor,
    speed: enhancement.speed,
    notes: enhancement.notes,
    contextWindow: formatTokenCount(limits.max_context_window_tokens),
    maxOutputTokens: formatTokenCount(limits.max_output_tokens),
  };
}

/**
 * 格式化價格（將 SDK 內部單位轉換為美元 / 1M tokens）
 * @param {number} price
 * @param {number} batchSize
 * @returns {string}
 */
export function formatPrice(price, batchSize) {
  if (price === undefined || price === null) return '—';
  if (!batchSize || batchSize === 0 || price === 0) return '—';
  // SDK 內部單位為 10^-11 美元 / batch_size tokens
  const dollars = price / 100_000_000_000;
  return `$${dollars.toFixed(2)}`;
}

/**
 * 依模型 ID 取得增強後資訊（從 SDK 模型清單中）
 * @param {string} id
 * @param {Array<object>} models
 * @returns {object | undefined}
 */
export function getModelById(id, models = []) {
  return models.find((m) => m.id === id);
}

/**
 * 依關鍵字過濾模型
 * @param {string} keyword
 * @param {Array<object>} models
 * @returns {Array<object>}
 */
export function filterModels(keyword, models = []) {
  if (!keyword) return models;
  const lower = keyword.toLowerCase();
  return models.filter(
    (m) =>
      m.id.toLowerCase().includes(lower) ||
      m.name.toLowerCase().includes(lower) ||
      (m.description && m.description.toLowerCase().includes(lower)) ||
      (m.provider && m.provider.toLowerCase().includes(lower))
  );
}
