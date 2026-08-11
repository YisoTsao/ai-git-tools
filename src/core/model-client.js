/**
 * Copilot 模型列表客戶端
 * 透過 @github/copilot-sdk 動態取得可用模型清單
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CopilotClient } from '@github/copilot-sdk';

// 暫存快取檔案路徑
const CACHE_DIR = join(tmpdir(), 'ai-git-tools');
const CACHE_FILE = join(CACHE_DIR, 'copilot-models-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小時

/**
 * 確保快取目錄存在
 */
function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * 讀取快取的模型清單
 * @returns {object | null}
 */
function readCache() {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const raw = readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.fetchedAt || !Array.isArray(parsed.models)) return null;

    const age = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (age > CACHE_TTL_MS) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * 寫入快取
 * @param {Array<object>} models
 */
function writeCache(models) {
  try {
    ensureCacheDir();
    writeFileSync(
      CACHE_FILE,
      JSON.stringify({ fetchedAt: new Date().toISOString(), models }, null, 2),
      'utf-8'
    );
  } catch {
    // 快取寫入失敗不影響主要功能
  }
}

/**
 * 清除模型快取
 */
export function clearModelCache() {
  try {
    if (existsSync(CACHE_FILE)) {
      writeFileSync(CACHE_FILE, '', 'utf-8');
    }
  } catch {
    // 忽略清除失敗
  }
}

/**
 * 從 Copilot SDK 取得可用模型清單
 * @param {object} options
 * @param {boolean} [options.noCache=false] - 是否忽略快取強制重新抓取
 * @param {boolean} [options.fallbackToCache=true] - SDK 失敗時是否回退使用快取
 * @returns {Promise<Array<object>>}
 */
export async function fetchCopilotModels({ noCache = false, fallbackToCache = true } = {}) {
  if (!noCache) {
    const cached = readCache();
    if (cached) {
      return cached.models;
    }
  }

  // 抑制 Copilot CLI 子程序的 SQLite ExperimentalWarning
  process.env.NODE_NO_WARNINGS = '1';

  const client = new CopilotClient();
  try {
    await client.start();
    const models = await client.listModels();

    writeCache(models);
    return models;
  } catch (error) {
    if (fallbackToCache) {
      const cached = readCache();
      if (cached) {
        error.fallbackToCache = true;
        error.cachedModels = cached.models;
        throw error;
      }
    }
    throw error;
  } finally {
    try {
      await client.stop();
    } catch {
      // 忽略關閉錯誤
    }
  }
}
