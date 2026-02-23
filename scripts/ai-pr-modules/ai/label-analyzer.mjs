import { execSync } from 'child_process';
import { log } from '../utils/helpers.mjs';

/**
 * Label 分析器 - 自動為 PR 添加合適的標籤
 */
export class LabelAnalyzer {
  /**
   * 分析應該添加的 Labels
   */
  analyzeLabels(prData) {
    const labels = new Set();

    // 根據 commit type
    const typeLabels = {
      feat: 'feature',
      fix: 'bug',
      refactor: 'refactor',
      perf: 'performance',
      docs: 'documentation',
      test: 'testing',
      style: 'style',
      chore: 'chore',
    };

    // 從標題中提取 type
    const titleMatch = prData.title.match(/^(\w+):/);
    if (titleMatch) {
      const type = titleMatch[1];
      if (typeLabels[type]) {
        labels.add(typeLabels[type]);
      }
    }

    // 根據影響範圍
    if (prData.blastRadius) {
      if (prData.blastRadius.impacts.includes('API 層')) {
        labels.add('api-change');
      }

      if (prData.blastRadius.impacts.includes('資料庫')) {
        labels.add('database');
      }

      if (prData.blastRadius.impacts.includes('使用者介面')) {
        labels.add('ui');
      }

      // 根據風險等級
      if (prData.blastRadius.riskLevel === '高') {
        labels.add('high-risk');
        labels.add('needs-careful-review');
      } else if (prData.blastRadius.riskLevel === '中') {
        labels.add('medium-risk');
      }
    }

    // 根據變更規模
    if (prData.stats) {
      if (prData.stats.filesChanged > 20) {
        labels.add('large-change');
      }

      if (prData.stats.filesChanged > 50) {
        labels.add('needs-review');
      }
    }

    // 根據警告
    if (prData.warnings && prData.warnings.length > 0) {
      labels.add('has-warnings');
    }

    return Array.from(labels);
  }

  /**
   * 應用 Labels 到 PR
   */
  async applyLabels(prNumber, labels) {
    if (!labels || labels.length === 0) {
      log.info('無需添加 Labels');
      return;
    }

    log.info(`正在添加 Labels: ${labels.join(', ')}`);

    const requestBody = JSON.stringify({ labels });

    try {
      execSync(
        `printf '%s' '${requestBody.replace(
          /'/g,
          "'\\''"
        )}' | gh api repos/:owner/:repo/issues/${prNumber}/labels --input - -X POST`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      log.success(`成功添加 ${labels.length} 個 Labels`);
    } catch (error) {
      log.warning('無法自動添加 Labels，請手動操作');
    }
  }

  /**
   * 分析並應用 Labels
   */
  async analyzeAndApply(prNumber, prData) {
    const labels = this.analyzeLabels(prData);
    await this.applyLabels(prNumber, labels);
    return labels;
  }
}
