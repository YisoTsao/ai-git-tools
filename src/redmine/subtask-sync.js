import {
  analyzeSubtasks as defaultAnalyzeSubtasks,
  validateFrontendAnalysis,
} from './subtask-analyzer.js';
import {
  buildManagedSubtaskKey,
  formatSubtaskContent,
  getManagedSubtaskKey,
  normalizeSubtaskTitle,
} from './subtask-formatters.js';

function projectId(issue = {}) {
  return issue.projectId ?? issue.project?.id ?? null;
}

function trackerId(issue = {}) {
  return issue.trackerId ?? issue.tracker?.id ?? null;
}

function sameValue(left, right) {
  return (left ?? null) === (right ?? null);
}

function normalizeRelations(relations = []) {
  return (Array.isArray(relations) ? relations : [])
    .map(relation => ({
      id: relation?.id ?? null,
      issueId: relation?.issue_id ?? relation?.issueId ?? null,
      issueToId: relation?.issue_to_id ?? relation?.issueToId ?? null,
      relationType: relation?.relation_type ?? relation?.relationType ?? null,
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function parentSnapshot(parent = {}) {
  return {
    id: parent.id,
    subject: parent.subject || '',
    description: parent.description || '',
    projectId: projectId(parent),
    trackerId: trackerId(parent),
    children: Array.isArray(parent.children)
      ? parent.children.map(child => ({
        id: child.id,
        subject: child.subject || '',
        description: child.description || '',
      }))
      : [],
    relations: normalizeRelations(parent.relations),
  };
}

function assertParentMetadata(parent) {
  if (projectId(parent) === null || trackerId(parent) === null) {
    throw new Error(`Issue #${parent.id} 缺少建立子任務需要的 project 或 tracker 資訊`);
  }
}

function assertNoPrivateFields(value, path = 'draft') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPrivateFields(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (/raw|secret|token|password|private|credential|api[-_]?key/i.test(key)) {
      throw new Error(`Frontend 子任務 draft 含有禁止保存的欄位：${path}.${key}`);
    }
    assertNoPrivateFields(child, `${path}.${key}`);
  }
}

function parentConflict(expected, current) {
  return expected.subject !== (current.subject || '')
    || expected.description !== (current.description || '')
    || !sameValue(expected.projectId, projectId(current))
    || !sameValue(expected.trackerId, trackerId(current))
    || JSON.stringify(normalizeRelations(expected.relations)) !== JSON.stringify(normalizeRelations(current.relations));
}

async function loadChildDetails(client, children = []) {
  const unavailableChildIds = [];
  if (typeof client?.getIssue !== 'function') {
    return { children, unavailableChildIds: children.filter(child => !child.description).map(child => child.id ?? 'unknown') };
  }
  const detailedChildren = await Promise.all(children.map(async child => {
    if (child.description) return child;
    if (child.id === undefined || child.id === null) {
      unavailableChildIds.push('unknown');
      return child;
    }
    try {
      const detail = await client.getIssue(child.id);
      return { ...child, description: detail.description || '' };
    } catch {
      unavailableChildIds.push(child.id);
      return child;
    }
  }));
  return { children: detailedChildren, unavailableChildIds };
}

export function validateSubtaskDraft(draft = {}) {
  assertNoPrivateFields(draft);
  if (draft.version !== 2 || draft.schemaVersion !== 2) {
    throw new Error('Frontend 子任務 draft v1 不受支援，請重新產生 schemaVersion 2 preview');
  }
  if (draft.analysisScope !== 'frontend') throw new Error('Frontend 子任務 draft 的 analysisScope 必須是 frontend');
  const maxSubtasks = draft.maxSubtasks === undefined ? 12 : Number(draft.maxSubtasks);
  if (!Number.isInteger(maxSubtasks) || maxSubtasks < 1 || maxSubtasks > 12) throw new Error('Frontend draft maxSubtasks 不合法');
  if (!draft.parent || !Array.isArray(draft.subtasks) || draft.subtasks.length === 0) throw new Error('Frontend 子任務 draft 格式不受支援');
  if (draft.parent.id === undefined || draft.parent.id === null) throw new Error('子任務 draft 缺少 parent Issue ID');
  if (draft.isComplete === false) {
    if (!Array.isArray(draft.completedSubtasks) || draft.completedSubtasks.length === 0) {
      throw new Error('Frontend partial draft 缺少 completedSubtasks');
    }
    for (const subtask of draft.completedSubtasks) {
      if (!subtask?.id || !subtask.title?.trim() || !subtask.content?.trim()) {
        throw new Error('Frontend partial draft 的 completedSubtasks 缺少 id、title 或 content');
      }
    }
    return draft;
  }
  validateFrontendAnalysis({
    ...draft,
    issueId: draft.parent.id,
  }, draft.parent.id, maxSubtasks);
  return draft;
}

export function serializeSubtaskDraft(draft) {
  validateSubtaskDraft(draft);
  return JSON.stringify(draft, null, 2);
}

export function parseSubtaskDraft(content) {
  let draft;
  try {
    draft = JSON.parse(String(content || ''));
  } catch (error) {
    throw new Error(`無法解析 Frontend 子任務 draft JSON：${error.message}`);
  }
  validateSubtaskDraft(draft);
  return draft;
}

export async function generateSubtaskDraft({
  parentIssueId,
  client,
  analyzeSubtasksFn = defaultAnalyzeSubtasks,
  maxSubtasks = 8,
  repositoryContext = {},
  model,
  maxRetries,
  timeout,
  onProgress = () => {},
  onPartialDraft = async () => {},
  resumeDraft = null,
}) {
  onProgress({ phase: 'read-parent', parentIssueId });
  const parent = await client.getIssue(parentIssueId, { include: 'children,relations' });
  assertParentMetadata(parent);
  onProgress({ phase: 'parent-read', parentIssueId, subject: parent.subject });
  onProgress({ phase: 'scope-analysis', parentIssueId });
  const completedSubtasks = Array.isArray(resumeDraft?.completedSubtasks)
    ? [...resumeDraft.completedSubtasks]
    : [];
  const analysis = await analyzeSubtasksFn({
    issue: parent,
    maxSubtasks,
    repositoryContext,
    model,
    maxRetries,
    timeout,
    onProgress,
    onSubtask: async (subtask, detail = {}) => {
      const completed = {
        ...subtask,
        content: formatSubtaskContent({
          subtask,
          parentIssueId: parent.id,
          scopeDecision: detail.outline?.scopeDecision || {},
          evidence: detail.outline?.evidence || [],
        }),
      };
      completedSubtasks.push(completed);
      const plannedIds = (detail.outline?.subtasks || []).map(item => item.id);
      await onPartialDraft({
        version: 2,
        schemaVersion: 2,
        isComplete: false,
        generatedAt: new Date().toISOString(),
        analysisScope: 'frontend',
        maxSubtasks,
        scopeDecision: detail.outline?.scopeDecision || {},
        evidence: detail.outline?.evidence || [],
        unresolvedItems: detail.outline?.unresolvedItems || [],
        parent: parentSnapshot(parent),
        completedSubtasks: [...completedSubtasks],
        pendingSubtasks: plannedIds.filter(id => !completedSubtasks.some(item => item.id === id)),
        subtasks: [...completedSubtasks],
      });
    },
    precompletedSubtasks: completedSubtasks,
  });
  if (analysis.schemaVersion !== 2) throw new Error('Frontend 子任務分析必須回傳 schemaVersion 2');
  const validated = validateFrontendAnalysis(analysis, parentIssueId, maxSubtasks);
  if (validated.scopeDecision.status === 'none') throw new Error(`Issue #${parentIssueId} 沒有可建立的 Frontend 子任務`);
  if (validated.scopeDecision.status === 'unclear') throw new Error(`Issue #${parentIssueId} 的 Frontend scope 不明，請先確認 unresolved items`);
  onProgress({ phase: 'subtasks-analyzed', parentIssueId, count: validated.subtasks.length });
  const subtasks = validated.subtasks.map((subtask, index) => {
    onProgress({ phase: 'screen-enrichment', index: index + 1, total: validated.subtasks.length, parentIssueId, title: subtask.title });
    return {
      ...subtask,
      content: formatSubtaskContent({
        subtask,
        parentIssueId: parent.id,
        scopeDecision: validated.scopeDecision,
        evidence: validated.evidence,
      }),
    };
  });
  return {
    version: 2,
    schemaVersion: 2,
    isComplete: true,
    generatedAt: new Date().toISOString(),
    analysisScope: validated.analysisScope,
    maxSubtasks,
    isIndivisible: Boolean(validated.isIndivisible),
    indivisibleReason: validated.indivisibleReason,
    scopeDecision: validated.scopeDecision,
    evidence: validated.evidence,
    unresolvedItems: validated.unresolvedItems,
    parent: parentSnapshot(parent),
    subtasks,
  };
}

export async function applySubtaskDraft({ draft, client, force = false, replace = false, onProgress = () => {} }) {
  validateSubtaskDraft(draft);
  if (draft.isComplete === false) {
    throw new Error('Frontend partial draft 尚未完成，請使用 preview 繼續產生剩餘子任務');
  }
  const parentIssueId = draft.parent.id;
  const current = await client.getIssue(parentIssueId, { include: 'children,relations' });
  if (!force && parentConflict(draft.parent, current)) return [{ parentIssueId, blocked: true, reason: 'conflict' }];
  assertParentMetadata(draft.parent);
  const childDetails = await loadChildDetails(client, Array.isArray(current.children) ? current.children : []);
  if (childDetails.unavailableChildIds.length > 0) {
    return [{ parentIssueId, blocked: true, reason: 'child-detail-unavailable', childIds: childDetails.unavailableChildIds }];
  }
  const children = childDetails.children;
  const keys = new Set(children.map(child => getManagedSubtaskKey(child.description)).filter(Boolean));
  const titles = new Set(children.map(child => String(child.subject || '').trim().toLocaleLowerCase()).filter(Boolean));
  const replaceable = replace ? children.filter(child => getManagedSubtaskKey(child.description)?.startsWith(`ai-git-tools:redmine-subtask parent=${parentIssueId}`)) : [];
  const results = [];
  if (replace) {
    const updateCount = Math.min(replaceable.length, draft.subtasks.length);
    for (let index = 0; index < updateCount; index += 1) {
      const replacement = replaceable[index];
      const subtask = draft.subtasks[index];
      const subtaskId = subtask.id || subtask.key;
      const title = normalizeSubtaskTitle(subtask.title);
      const content = formatSubtaskContent({
        subtask,
        parentIssueId,
        scopeDecision: draft.scopeDecision,
        evidence: draft.evidence,
      });
      onProgress({ phase: 'replace-child', index: index + 1, total: draft.subtasks.length, parentIssueId, key: subtaskId, title });
      try {
          await client.updateIssue(replacement.id, { subject: title, description: content });
          results.push({ id: subtaskId, title, updated: true, childId: replacement.id });
      } catch (error) {
          results.push({ id: subtaskId, title, updated: false, childId: replacement.id, error: String(error?.message || error) });
      }
    }
    for (let index = updateCount; index < draft.subtasks.length; index += 1) {
      const subtask = draft.subtasks[index];
      const subtaskId = subtask.id || subtask.key;
      const title = normalizeSubtaskTitle(subtask.title);
      const content = formatSubtaskContent({
        subtask,
        parentIssueId,
        scopeDecision: draft.scopeDecision,
        evidence: draft.evidence,
      });
      onProgress({ phase: 'create-child', index: index + 1, total: draft.subtasks.length, parentIssueId, key: subtaskId, title });
      try {
        const child = await client.createIssue({
          projectId: projectId(draft.parent),
          trackerId: trackerId(draft.parent),
          subject: title,
          description: content,
          parentIssueId,
        });
        const childId = child?.id ?? child?.issue?.id ?? null;
        results.push({ id: subtaskId, title, created: true, childId });
      } catch (error) {
        results.push({ id: subtaskId, title, created: false, error: String(error?.message || error) });
      }
    }
    return results;
  }
  for (const [index, subtask] of draft.subtasks.entries()) {
    const subtaskId = subtask.id || subtask.key;
    const key = buildManagedSubtaskKey(parentIssueId, subtaskId);
    const title = normalizeSubtaskTitle(subtask.title);
    const content = formatSubtaskContent({
      subtask,
      parentIssueId,
      scopeDecision: draft.scopeDecision,
      evidence: draft.evidence,
    });
    onProgress({ phase: 'create-child', index: index + 1, total: draft.subtasks.length, parentIssueId, key: subtaskId, title });
    if (keys.has(key) || titles.has(title.toLocaleLowerCase())) {
      results.push({ id: subtaskId, title, skipped: true, reason: 'duplicate' });
      continue;
    }
    try {
      const child = await client.createIssue({
        projectId: projectId(draft.parent),
        trackerId: trackerId(draft.parent),
        subject: title,
        description: content,
        parentIssueId,
      });
      const childId = child?.id ?? child?.issue?.id ?? null;
      results.push({ id: subtaskId, title, created: true, childId });
      keys.add(key);
      titles.add(String(subtask.title).trim().toLocaleLowerCase());
    } catch (error) {
      results.push({ id: subtaskId, title, created: false, error: String(error?.message || error) });
    }
  }
  return results;
}