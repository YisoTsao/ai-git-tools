import OpenCC from 'opencc-js';

const convertToTraditional = OpenCC.Converter({ from: 'cn', to: 'tw' });

/**
 * 將文字轉換為台灣繁體中文
 * @param {string} value
 * @returns {string}
 */
export function toTraditionalChinese(value) {
  return typeof value === 'string' ? convertToTraditional(value) : value;
}

/**
 * 遞迴將資料中的所有字串轉換為台灣繁體中文
 * @param {unknown} value
 * @returns {unknown}
 */
export function normalizeAnalysisLanguage(value) {
  if (typeof value === 'string') return toTraditionalChinese(value);
  if (Array.isArray(value)) return value.map(normalizeAnalysisLanguage);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeAnalysisLanguage(item)])
    );
  }
  return value;
}
