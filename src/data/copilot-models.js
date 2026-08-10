/**
 * GitHub Copilot SDK 可用模型資訊表
 * 靜態維護，供 model-info 命令使用
 */

export const COPILOT_MODELS = [
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: '目前預設模型，綜合表現均衡，適合大多數任務',
    contextWindow: '128K',
    recommendedFor: ['commit', 'pr', 'analysis'],
    speed: 'medium',
    notes: '在極大 diff 的 PR 分析時可能較慢',
  },
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    description: '較新的模型，適合大型 PR 與複雜分析',
    contextWindow: '128K',
    recommendedFor: ['pr', 'analysis'],
    speed: 'medium',
    notes: '大 diff 分析建議使用此模型',
  },
];

/**
 * 依模型 ID 取得資訊
 * @param {string} id
 * @returns {object | undefined}
 */
export function getModelById(id) {
  return COPILOT_MODELS.find((m) => m.id === id);
}

/**
 * 依關鍵字過濾模型
 * @param {string} keyword
 * @returns {Array<object>}
 */
export function filterModels(keyword) {
  if (!keyword) return COPILOT_MODELS;
  const lower = keyword.toLowerCase();
  return COPILOT_MODELS.filter(
    (m) =>
      m.id.toLowerCase().includes(lower) ||
      m.name.toLowerCase().includes(lower) ||
      m.description.toLowerCase().includes(lower)
  );
}
