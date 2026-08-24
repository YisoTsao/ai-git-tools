/**
 * Redmine Issue 更新命令
 */

import { readFileSync, writeFileSync } from 'fs';
import { loadConfig } from '../core/config-loader.js';
import {
  collectGitEvidence,
  collectPullRequestEvidence,
  findCurrentPullRequestEvidence,
} from '../redmine/git-evidence.js';
import { buildRedmineConfig } from '../redmine/config.js';
import { RedmineClient } from '../redmine/redmine-client.js';
import { Logger } from '../utils/logger.js';
import { toTraditionalChinese } from '../utils/traditional-chinese.js';
import {
  applyRedmineDraft,
  generateRedmineDraft,
  parseDraft,
  serializeDraft,
} from '../redmine/issue-sync.js';
import { formatRedminePreview as renderPreview } from '../redmine/redmine-formatters.js';

const logger = new Logger();

function countLines(value) {
  return String(value || '').split('\n').filter(Boolean).length;
}

function printProgress(progress) {
  switch (progress.phase) {
    case 'read-issue':
      logger.step(`[${progress.index}/${progress.total}] 讀取 Redmine Issue #${progress.issueId}...`);
      break;
    case 'issue-read':
      logger.success(`Issue #${progress.issueId} 已取得：${toTraditionalChinese(progress.subject || '無標題')}`);
      break;
    case 'analyze-issue':
      logger.step(`[${progress.index}/${progress.total}] 使用 Copilot 分析 Issue #${progress.issueId}...`);
      break;
    case 'issue-analyzed':
      logger.success(`Issue #${progress.issueId} AI 分析完成`);
      break;
    case 'issue-complete':
      logger.success(`Issue #${progress.issueId} 更新草稿完成`);
      break;
    case 'apply-issue':
      logger.step(`[${progress.index}/${progress.total}] 更新 Redmine Issue #${progress.issueId}...`);
      break;
    default:
      break;
  }
}

function printApplyResults(results) {
  for (const result of results) {
    if (result.applied) {
      console.log(`✅ Issue #${result.issueId} 已更新`);
    } else if (result.skipped) {
      const reason = result.reason === 'duplicate' ? '已同步，略過重複更新' : '資料已變更，略過更新';
      console.log(`⚠️ Issue #${result.issueId} ${reason}`);
    } else {
      console.log(`❌ Issue #${result.issueId} 更新失敗：${result.error}`);
    }
  }
}

/**
 * 驗證 Redmine update CLI 參數
 * @param {object} options
 */
export function validateRedmineOptions(options = {}) {
  if (options.apply && options.preview) {
    throw new Error('--apply 與 --preview 不可同時使用');
  }
  if (options.apply && !options.from) {
    throw new Error('--apply 必須搭配 --from <file> 使用');
  }
  if (options.from && !options.apply) {
    throw new Error('--from 只能搭配 --apply 使用');
  }
  if (!options.apply && !options.preview) {
    throw new Error('請使用 --preview 產生草稿，確認後再使用 --apply --from <file>');
  }
  if (!options.apply && (!options.issue || options.issue.length === 0)) {
    throw new Error('preview 模式至少需要一個 --issue <id>');
  }
  const invalidIssueIds = (options.issue || []).filter(id => !/^[1-9]\d*$/.test(String(id)));
  if (invalidIssueIds.length > 0) {
    throw new Error(`Issue ID 必須是正整數：${invalidIssueIds.join('、')}`);
  }
}

/**
 * 判斷 apply 是否有實際失敗的 Issue
 * @param {Array<object>} results
 * @returns {boolean}
 */
export function hasApplyFailures(results = []) {
  return results.some(result => result.applied === false && !result.skipped);
}

/**
 * 確認 preview 至少產生一筆可套用草稿
 * @param {object} draft
 */
export function validateGeneratedDraft(draft = {}) {
  if (!Array.isArray(draft.drafts) || draft.drafts.length === 0) {
    const details = draft.failures?.map(failure => `#${failure.issueId}: ${failure.error}`).join('；');
    throw new Error(
      `沒有成功產生任何 Issue 更新草稿${details ? `。失敗原因：${details}` : ''}`
    );
  }
}

/**
 * 執行 Redmine Issue preview 或 apply
 * @param {object} options
 */
export async function redmineUpdateCommand(options = {}) {
  validateRedmineOptions(options);
  logger.header('Redmine Issue 更新分析');
  const config = await loadConfig();
  logger.step('檢查 Redmine 設定...');
  const redmineConfig = buildRedmineConfig(config, process.env);
  const client = new RedmineClient(redmineConfig);
  logger.success('Redmine 設定已載入');

  if (options.apply) {
    logger.step(`讀取已審核草稿：${options.from}`);
    const draft = parseDraft(readFileSync(options.from, 'utf-8'));
    logger.success(`草稿已載入，共 ${draft.drafts.length} 個 Issue`);
    const results = await applyRedmineDraft({
      draft,
      client,
      force: options.force,
      onProgress: printProgress,
    });
    printApplyResults(results);
    if (hasApplyFailures(results)) {
      throw new Error('部分 Redmine Issue 更新失敗，請查看上方結果並重新處理失敗項目');
    }
    return results;
  }

  logger.step('收集 Git branch、Base、commits、修改檔案與 diff...');
  const evidence = collectGitEvidence({ baseBranch: options.base });
  logger.success(
    `Git evidence 已取得：${countLines(evidence.commits)} 個 commits、${evidence.changedFiles.length} 個修改檔案；Base：${evidence.baseBranch}`
  );

  let pullRequest = null;
  if (options.pr) {
    logger.step(`讀取指定 GitHub PR #${options.pr}...`);
    pullRequest = collectPullRequestEvidence(options.pr);
  } else {
    logger.step(`尋找 branch ${evidence.currentBranch} 對應的 GitHub PR...`);
    try {
      pullRequest = findCurrentPullRequestEvidence(evidence.currentBranch);
    } catch {
      pullRequest = null;
    }
  }
  if (pullRequest) {
    logger.success(`已找到 PR #${pullRequest.number}：${toTraditionalChinese(pullRequest.title || '無標題')}`);
    console.log(`🔗 ${pullRequest.url}`);
  } else {
    logger.info('目前 branch 沒有找到對應的 GitHub PR，略過 PR 資訊');
  }

  const draft = await generateRedmineDraft({
    issueIds: options.issue,
    client,
    evidence,
    pullRequest,
    model: config.ai.model,
    maxRetries: config.ai.maxRetries,
    onProgress: printProgress,
  });

  validateGeneratedDraft(draft);
  logger.success(`已完成 ${draft.drafts.length} 個 Issue 的更新草稿分析`);
  console.log(renderPreview(draft.drafts));
  for (const failure of draft.failures) {
    console.log(`❌ Issue #${failure.issueId} 無法產生更新：${failure.error}`);
  }
  for (const item of draft.drafts) {
    if (item.customFieldWarning) {
      console.log(`⚠️ Issue #${item.issueId}：${item.customFieldWarning}`);
    }
  }
  console.log('\n尚未修改 Redmine。');
  if (options.output) {
    writeFileSync(options.output, serializeDraft(draft), 'utf-8');
    console.log(`預覽草稿已保存：${options.output}`);
    console.log(`請使用 --apply --from ${options.output} 套用。`);
  } else {
    console.log('請重新執行並加入 --output redmine-update.json 保存草稿。');
  }

  return draft;
}