/**
 * model-info 命令
 * 顯示 GitHub Copilot SDK 可用模型資訊
 */

import ora from 'ora';
import { Logger } from '../utils/logger.js';
import { fetchCopilotModels } from '../core/model-client.js';
import {
  enrichModel,
  getModelById,
  filterModels,
  formatPrice,
  formatTokenCount,
  getTokenPrices,
} from '../data/copilot-models.js';

const logger = new Logger();

/**
 * 格式化建議用途陣列為可讀字串
 * @param {string[]} items
 * @returns {string}
 */
function formatRecommendedFor(items) {
  if (!items || items.length === 0) return '—';
  return items.join('、');
}

/**
 * 格式化支援能力陣列
 * @param {object} supports
 * @returns {string}
 */
function formatCapabilities(supports = {}) {
  const caps = [];
  if (supports.vision) caps.push('vision');
  if (supports.tool_calls) caps.push('tools');
  if (supports.reasoningEffort || supports.reasoning_effort) caps.push('reasoning');
  if (supports.streaming) caps.push('streaming');
  if (supports.parallel_tool_calls) caps.push('parallel-tools');
  if (supports.structured_outputs) caps.push('structured-output');
  if (supports.adaptive_thinking && supports.adaptive_thinking !== 'unsupported') {
    caps.push('adaptive-thinking');
  }
  return caps.length > 0 ? caps.join('、') : '—';
}

/**
 * 取得模型狀態圖示
 * @param {string} state
 * @returns {string}
 */
function policyStateLabel(state) {
  switch (state) {
    case 'enabled':
      return '啟用';
    case 'disabled':
      return '停用';
    case 'unconfigured':
      return '未配置';
    default:
      return state || '—';
  }
}

/**
 * 印出單一模型詳細資訊
 * @param {object} model
 */
function printModel(model) {
  const billing = model.tokenPrices || getTokenPrices(model.billing);
  const capabilities = model.capabilities || {};

  console.log(`\n ${logger.colors?.cyan ?? ''}${model.id}${logger.colors?.reset ?? ''}`);
  console.log(' ─────────────────────────────────────────────────────────────');
  console.log(` 名稱：        ${model.name}`);
  console.log(` 供應商：      ${model.provider}`);
  console.log(` 模型家族：    ${capabilities.family || '—'}`);
  console.log(` 模型類型：    ${capabilities.type || '—'}`);
  console.log(` Tokenizer：   ${capabilities.tokenizer || '—'}`);
  console.log(` 模型分類：    ${model.modelPickerCategory || '—'}`);
  console.log(` 價格分類：    ${model.modelPickerPriceCategory || '—'}`);
  console.log(` 描述：        ${model.description}`);
  console.log(` 上下文：      ${model.contextWindow}`);
  console.log(` 最大輸出：    ${model.maxOutputTokens}`);
  console.log(` 建議用途：    ${formatRecommendedFor(model.recommendedFor)}`);
  console.log(` 速度：        ${model.speed}`);
  console.log(` 狀態：        ${policyStateLabel(model.policy?.state)}`);
  console.log(` 能力：        ${formatCapabilities(capabilities.supports)}`);
  if (billing && billing.batch_size > 0) {
    const hasAnyPrice =
      billing.input_price > 0 || billing.output_price > 0 || billing.cache_price > 0;
    if (hasAnyPrice) {
      console.log(` 價格（預估）:`);
      console.log(
        `   輸入：      ${formatPrice(billing.input_price, billing.batch_size, billing.price_scale)} / ${formatTokenCount(billing.batch_size)} tokens`
      );
      console.log(
        `   輸出：      ${formatPrice(billing.output_price, billing.batch_size, billing.price_scale)} / ${formatTokenCount(billing.batch_size)} tokens`
      );
      if (billing.cache_price !== undefined) {
        console.log(
          `   快取：      ${formatPrice(billing.cache_price, billing.batch_size, billing.price_scale)} / ${formatTokenCount(billing.batch_size)} tokens`
        );
      }
      if (billing.cache_read_price !== undefined) {
        console.log(
          `   快取讀取：  ${formatPrice(billing.cache_read_price, billing.batch_size, billing.price_scale)} / ${formatTokenCount(billing.batch_size)} tokens`
        );
      }
      if (billing.cache_write_price !== undefined) {
        console.log(
          `   快取寫入：  ${formatPrice(billing.cache_write_price, billing.batch_size, billing.price_scale)} / ${formatTokenCount(billing.batch_size)} tokens`
        );
      }
    }
  }
  if (model.supportedReasoningEfforts && model.supportedReasoningEfforts.length > 0) {
    console.log(
      ` Reasoning：   ${model.supportedReasoningEfforts.join('、')}（預設：${model.defaultReasoningEffort || '—'}）`
    );
  }
  if (model.notes) {
    console.log(` 備註：        ${model.notes}`);
  }
}

/**
 * 印出模型列表（精簡版）
 * @param {object[]} models
 */
function printModelList(models) {
  console.log();
  for (const model of models) {
    const idPart = `${logger.colors?.cyan ?? ''}${model.id.padEnd(18)}${logger.colors?.reset ?? ''}`;
    console.log(`  ${idPart} ${model.description}`);
  }
}

/**
 * model-info 命令入口
 * @param {object} options - commander 解析後的選項
 */
export async function modelInfoCommand(options) {
  const { json, filter, model: modelId, cache } = options;
  const noCache = cache === false;

  let sdkModels = [];
  let usedCache = false;

  const spinner = ora('正在連線到 Copilot 取得模型清單...').start();

  try {
    sdkModels = await fetchCopilotModels({ noCache });
    spinner.stop();
  } catch (error) {
    spinner.stop();
    if (error.cachedModels) {
      sdkModels = error.cachedModels;
      usedCache = true;
    } else {
      logger.error(`無法取得模型清單：${error.message}`);
      logger.info('請確認已安裝 GitHub CLI 並完成 Copilot 授權（gh auth login）');
      process.exit(1);
    }
  }

  const models = sdkModels.map(enrichModel);

  if (json) {
    let output = models;
    if (filter) output = filterModels(filter, output);
    if (modelId) {
      const model = getModelById(modelId, output);
      output = model ? [model] : [];
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  logger.section('🤖 Copilot 可用模型');

  if (usedCache) {
    logger.warning('即時取得失敗，顯示快取資料');
  }

  if (modelId) {
    const model = getModelById(modelId, models);
    if (!model) {
      logger.error(`找不到模型「${modelId}」`);
      logger.info(`可用模型：${models.map(m => m.id).join('、')}`);
      process.exit(1);
    }
    printModel(model);
    console.log();
    return;
  }

  const filteredModels = filterModels(filter, models);
  if (filteredModels.length === 0) {
    logger.warning('沒有符合條件的模型');
    return;
  }

  if (filter) {
    printModelList(filteredModels);
  } else {
    for (const model of filteredModels) {
      printModel(model);
    }
  }

  console.log();
  logger.info(`共 ${filteredModels.length} 個模型，使用 --model <id> 查看詳細資訊`);
}
