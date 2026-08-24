import { analyzeIssue as defaultAnalyzeIssue } from './issue-analyzer.js';
import {
  formatRedmineNote,
  formatRedminePreview,
  resolveIssueStatus,
} from './redmine-formatters.js';

function uniqueIssueIds(issueIds = []) {
  return [...new Set(issueIds.map(id => Number(id)).filter(Number.isInteger))];
}

function getCurrentDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * 判斷 Redmine 狀態是否代表已解決
 * @param {string} statusName
 * @returns {boolean}
 */
export function isResolvedStatus(statusName = '') {
  return /已解決|resolved/i.test(statusName);
}

/**
 * 建立測試機完成欄位更新
 * @param {object} issue
 * @param {{statusId: number, statusName: string}} selectedStatus
 * @returns {{doneRatio?: number, customFields: Array<object>, warning?: string}}
 */
export function buildCompletionUpdate(issue, selectedStatus) {
  if (!isResolvedStatus(selectedStatus.statusName)) return { customFields: [] };

  const progressField = issue.customFields?.find(
    field => field.name?.trim() === '程式碼更版進度'
  );
  if (!progressField) {
    return {
      doneRatio: 100,
      dueDate: getCurrentDate(),
      customFields: [],
      warning: '找不到 custom field「程式碼更版進度」，已略過 checkbox 更新',
    };
  }

  return {
    doneRatio: 100,
    dueDate: getCurrentDate(),
    customFields: [{ id: progressField.id, value: ['測'] }],
  };
}

/**
 * 產生一份待審核的 Redmine 更新草稿
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function generateRedmineDraft({
  issueIds,
  client,
  evidence,
  pullRequest = null,
  analyzeIssueFn = defaultAnalyzeIssue,
  selectStatusFn = resolveIssueStatus,
  model,
  maxRetries,
  onProgress = () => {},
}) {
  const drafts = [];
  const failures = [];
  const uniqueIds = uniqueIssueIds(issueIds);
  for (const [index, issueId] of uniqueIds.entries()) {
    try {
      onProgress({ phase: 'read-issue', index: index + 1, total: uniqueIds.length, issueId });
      const issue = await client.getIssue(issueId);
      onProgress({ phase: 'issue-read', index: index + 1, total: uniqueIds.length, issueId, subject: issue.subject });
      onProgress({ phase: 'analyze-issue', index: index + 1, total: uniqueIds.length, issueId });
      const analysis = await analyzeIssueFn({ issue, evidence: { ...evidence, pullRequest }, model, maxRetries });
      onProgress({ phase: 'issue-analyzed', index: index + 1, total: uniqueIds.length, issueId });
      const fallbackStatuses = issue.allowedStatuses?.length ? [] : await client.getIssueStatuses();
      const selectedStatus = selectStatusFn === resolveIssueStatus
        ? resolveIssueStatus(issue, fallbackStatuses)
        : await selectStatusFn(issue, { client });
      onProgress({ phase: 'issue-complete', index: index + 1, total: uniqueIds.length, issueId });
      const completion = buildCompletionUpdate(issue, selectedStatus);
      const note = formatRedmineNote({
        issue,
        analysis,
        evidence,
        pullRequest,
      });

      drafts.push({
        issueId,
        subject: issue.subject,
        originalStatusId: issue.status?.id ?? null,
        originalStatusName: issue.status?.name || '',
        originalDescription: issue.description,
        statusId: selectedStatus.statusId,
        statusName: selectedStatus.statusName,
        doneRatio: completion.doneRatio,
        dueDate: completion.dueDate,
        customFields: completion.customFields,
        customFieldWarning: completion.warning || null,
        analysis,
        note,
      });
    } catch (error) {
      failures.push({ issueId, error: error.message });
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    evidence,
    pullRequest,
    drafts,
    failures,
  };
}

/**
 * 套用已審核的 Redmine 更新草稿
 * @param {{draft: object, client: object, force?: boolean}} options
 * @returns {Promise<Array<object>>}
 */
export async function applyRedmineDraft({ draft, client, force = false, onProgress = () => {} }) {
  if (!draft || !Array.isArray(draft.drafts)) {
    throw new Error('無效的 Redmine draft');
  }

  const results = [];
  for (const [index, item] of draft.drafts.entries()) {
    try {
      onProgress({ phase: 'apply-issue', index: index + 1, total: draft.drafts.length, issueId: item.issueId });
      const current = await client.getIssue(item.issueId, { include: 'allowed_statuses' });

      const statusChanged = item.originalStatusId !== null && current.status?.id !== item.originalStatusId;
      const descriptionChanged = current.description !== item.originalDescription;
      if (!force && (statusChanged || descriptionChanged)) {
        results.push({ issueId: item.issueId, skipped: true, reason: 'conflict' });
        continue;
      }

      const update = { statusId: item.statusId, notes: item.note };
      if (item.doneRatio !== undefined) update.doneRatio = item.doneRatio;
      if (item.dueDate !== undefined) update.dueDate = item.dueDate;
      if (item.description !== undefined) update.description = item.description;
      if (item.customFields?.length) update.customFields = item.customFields;

      await client.updateIssue(item.issueId, update);
      results.push({ issueId: item.issueId, applied: true });
    } catch (error) {
      results.push({ issueId: item.issueId, applied: false, error: error.message });
    }
  }
  return results;
}

/**
 * 將 draft 序列化為可保存的 JSON
 * @param {object} draft
 * @returns {string}
 */
export function serializeDraft(draft) {
  return `${JSON.stringify(draft, null, 2)}\n`;
}

/**
 * 解析 draft JSON
 * @param {string} content
 * @returns {object}
 */
export function parseDraft(content) {
  const draft = JSON.parse(content);
  if (draft.version !== 1 || !Array.isArray(draft.drafts)) {
    throw new Error('Redmine draft 格式不受支援');
  }
  return draft;
}

export { formatRedminePreview };
