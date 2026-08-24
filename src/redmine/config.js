/**
 * Redmine 連線設定
 */

/**
 * 建立 Redmine API 設定
 * @param {object} projectConfig
 * @param {NodeJS.ProcessEnv} env
 * @returns {{url: string, apiKey: string}}
 */
export function buildRedmineConfig(projectConfig = {}, env = process.env) {
  const url = env.REDMINE_URL || projectConfig.redmine?.url;
  const apiKey = env.REDMINE_API_KEY;

  if (!url || !apiKey) {
    throw new Error(
      '缺少 Redmine 設定。請先設定 REDMINE_URL 與 REDMINE_API_KEY 環境變數。\n' +
        '請依照目前使用的 shell 參考 README 中的 Redmine 設定說明。\n' +
        'API key 不要放在 CLI 參數或提交到 Git。'
    );
  }

  return {
    url: url.replace(/\/+$/, ''),
    apiKey,
  };
}
