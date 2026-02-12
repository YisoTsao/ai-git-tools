/**
 * 配置載入器
 * 
 * 負責載入和合併配置檔案與命令列參數
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * 預設配置
 */
export const DEFAULT_CONFIG = {
  ai: {
    model: 'gpt-4.1',
    maxDiffLength: 8000,
    maxRetries: 3,
  },
  github: {
    orgName: null, // 自動從 git remote 取得
    defaultBase: 'auto',
    autoLabels: true,
  },
  reviewers: {
    autoSelect: false,
    maxSuggested: 5,
    gitHistoryDepth: 20,
    excludeAuthors: [],
  },
  output: {
    verbose: false,
    saveHistory: false,
  },
};

/**
 * 載入配置檔案
 */
async function loadConfigFile() {
  const configFiles = [
    '.ai-git-config.js',
    '.ai-git-config.mjs',
    'ai-git.config.js',
    'ai-git.config.mjs',
  ];

  for (const configFile of configFiles) {
    const configPath = resolve(process.cwd(), configFile);
    if (existsSync(configPath)) {
      try {
        const imported = await import(configPath);
        return imported.default || {};
      } catch (error) {
        console.warn(`警告: 無法載入配置檔案 ${configFile}:`, error.message);
      }
    }
  }

  return {};
}

/**
 * 深度合併物件
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 載入完整配置（配置檔 + CLI 參數）
 */
export async function loadConfig(cliOptions = {}) {
  // 1. 載入配置檔案
  const userConfig = await loadConfigFile();
  
  // 2. 合併預設配置與使用者配置
  let config = deepMerge(DEFAULT_CONFIG, userConfig);
  
  // 3. 合併 CLI 參數（最高優先權）
  if (cliOptions.model) {
    config.ai.model = cliOptions.model;
  }
  
  if (cliOptions.verbose !== undefined) {
    config.output.verbose = cliOptions.verbose;
  }
  
  if (cliOptions.maxDiff) {
    config.ai.maxDiffLength = cliOptions.maxDiff;
  }
  
  if (cliOptions.maxRetries) {
    config.ai.maxRetries = cliOptions.maxRetries;
  }
  
  // GitHub 相關
  if (cliOptions.org) {
    config.github.orgName = cliOptions.org;
  }
  
  if (cliOptions.base) {
    config.github.defaultBase = cliOptions.base;
  }
  
  if (cliOptions.autoReviewers !== undefined) {
    config.reviewers.autoSelect = cliOptions.autoReviewers;
  }
  
  if (cliOptions.autoLabels !== undefined) {
    config.github.autoLabels = cliOptions.autoLabels;
  }
  
  // 其他 CLI 參數
  config.baseBranch = cliOptions.base || null;
  config.headBranch = cliOptions.head || null;
  config.draft = cliOptions.draft || false;
  config.preview = cliOptions.preview || false;
  config.noConfirm = cliOptions.noConfirm || false;
  
  return config;
}

/**
 * 驗證配置
 */
export function validateConfig(config) {
  const errors = [];
  
  if (!config.ai?.model) {
    errors.push('AI model 未設定');
  }
  
  if (config.ai?.maxDiffLength && config.ai.maxDiffLength < 1000) {
    errors.push('maxDiffLength 太小（最少 1000）');
  }
  
  if (config.ai?.maxRetries && (config.ai.maxRetries < 1 || config.ai.maxRetries > 10)) {
    errors.push('maxRetries 必須在 1-10 之間');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
