/**
 * Copilot 模型本機增強資料表
 * 用來補充 Copilot SDK listModels() 回傳的動態資料
 */

const MODEL_ENHANCEMENTS = {};

/**
 * 推斷模型供應商
 * @param {string} modelId
 * @returns {string}
 */
export function inferProvider(modelId) {
  if (modelId.startsWith('claude')) return 'Anthropic';
  if (modelId.startsWith('gpt')) return 'OpenAI';
  if (modelId.startsWith('gemini')) return 'Google';
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
  return (
    MODEL_ENHANCEMENTS[modelId] || {
      description: 'Copilot SDK 回報的可用模型',
      recommendedFor: [],
      speed: 'medium',
      notes: '',
    }
  );
}

/**
 * 正規化 Copilot SDK 的價格欄位
 * @param {object} billing
 * @returns {object | null}
 */
export function getTokenPrices(billing = {}) {
  const prices = billing.tokenPrices || billing.token_prices;
  if (!prices) return null;

  const isCurrentFormat = Boolean(billing.tokenPrices);
  return {
    input_price: prices.inputPrice ?? prices.input_price,
    output_price: prices.outputPrice ?? prices.output_price,
    cache_price: prices.cachePrice ?? prices.cache_price,
    cache_read_price: prices.cacheReadPrice ?? prices.cache_read_price,
    cache_write_price: prices.cacheWritePrice ?? prices.cache_write_price,
    batch_size: prices.batchSize ?? prices.batch_size,
    context_max: prices.contextMax ?? prices.context_max,
    max_prompt_tokens: prices.maxPromptTokens ?? prices.max_prompt_tokens,
    long_context: prices.longContext ?? prices.long_context,
    price_scale: isCurrentFormat ? 'cents' : 'sdk',
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
    tokenPrices: getTokenPrices(sdkModel.billing),
  };
}

/**
 * 格式化價格（將 SDK 內部單位轉換為美元 / 1M tokens）
 * @param {number} price
 * @param {number} batchSize
 * @param {'sdk' | 'cents'} priceScale
 * @returns {string}
 */
export function formatPrice(price, batchSize, priceScale = 'sdk') {
  if (price === undefined || price === null) return '—';
  if (!batchSize || batchSize === 0 || price === 0) return '—';
  const dollars = priceScale === 'cents' ? price / 100 : price / 100_000_000_000;
  return `$${dollars.toFixed(2)}`;
}

/**
 * 依模型 ID 取得增強後資訊（從 SDK 模型清單中）
 * @param {string} id
 * @param {Array<object>} models
 * @returns {object | undefined}
 */
export function getModelById(id, models = []) {
  return models.find(m => m.id === id);
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
    m =>
      m.id.toLowerCase().includes(lower) ||
      m.name.toLowerCase().includes(lower) ||
      (m.description && m.description.toLowerCase().includes(lower)) ||
      (m.provider && m.provider.toLowerCase().includes(lower))
  );
}
