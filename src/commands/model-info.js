/**
 * model-info 命令
 * 顯示 GitHub Copilot SDK 可用模型資訊
 */

import { Logger } from '../utils/logger.js';
import {
  COPILOT_MODELS,
  getModelById,
  filterModels,
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
 * 印出單一模型詳細資訊
 * @param {object} model
 */
function printModel(model) {
  console.log(`\n ${logger.colors?.cyan ?? ''}${model.id}${logger.colors?.reset ?? ''}`);
  console.log(' ─────────────────────────────────────────────────────────────');
  console.log(` 名稱：        ${model.name}`);
  console.log(` 描述：        ${model.description}`);
  console.log(` 上下文：      ${model.contextWindow}`);
  console.log(` 建議用途：    ${formatRecommendedFor(model.recommendedFor)}`);
  console.log(` 速度：        ${model.speed}`);
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
    const idPart = `${logger.colors?.cyan ?? ''}${model.id.padEnd(12)}${logger.colors?.reset ?? ''}`;
    console.log(`  ${idPart} ${model.description}`);
  }
}

/**
 * model-info 命令入口
 * @param {object} options - commander 解析後的選項
 */
export async function modelInfoCommand(options) {
  const { json, filter, model: modelId } = options;

  if (json) {
    let output = COPILOT_MODELS;
    if (filter) output = filterModels(filter);
    if (modelId) {
      const model = getModelById(modelId);
      output = model ? [model] : [];
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  logger.section('🤖 Copilot 可用模型');

  if (modelId) {
    const model = getModelById(modelId);
    if (!model) {
      logger.error(`找不到模型「${modelId}」`);
      logger.info(`可用模型：${COPILOT_MODELS.map((m) => m.id).join('、')}`);
      process.exit(1);
    }
    printModel(model);
    console.log();
    return;
  }

  const models = filterModels(filter);
  if (models.length === 0) {
    logger.warning('沒有符合條件的模型');
    return;
  }

  if (filter) {
    printModelList(models);
  } else {
    for (const model of models) {
      printModel(model);
    }
  }

  console.log();
  logger.info(`共 ${models.length} 個模型，使用 --model <id> 查看詳細資訊`);
}
