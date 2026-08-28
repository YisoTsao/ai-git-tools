import {
  generateGenericDecomposition,
  validateGenericDecomposition,
} from './generic-subtask-analyzer.js';
import {
  formatGenericSubtaskContent,
  getGenericManagedMarker,
} from './generic-subtask-formatters.js';

export const GENERIC_DRAFT_VERSION = 1;
const SENSITIVE_KEY_PATTERN = /raw|secret|token|password|private|credential|api[-_]?key/i;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function assertSafeDraft(value, path = 'draft') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeDraft(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) throw new Error(`通用 draft 含有禁止保存的欄位：${path}.${key}`);
    assertSafeDraft(child, `${path}.${key}`);
  }
}

function normalizeParent(parent = {}) {
  return {
    id: parent.id,
    subject: text(parent.subject),
    description: text(parent.description),
    projectId: parent.projectId ?? parent.project?.id ?? null,
    trackerId: parent.trackerId ?? parent.tracker?.id ?? null,
    children: Array.isArray(parent.children) ? parent.children : [],
    relations: Array.isArray(parent.relations) ? parent.relations : [],
  };
}

function normalizeDraftRelations(relations, subIssues) {
  const ids = new Set(subIssues.map(subIssue => subIssue.temp_id));
  return (Array.isArray(relations) ? relations : []).map((relation, index) => {
    const sourceTempId = text(relation?.source_temp_id || relation?.sourceTempId);
    const targetTempId = text(relation?.target_temp_id || relation?.targetTempId);
    const relationType = text(relation?.relation_type || relation?.relationType);
    if (!ids.has(sourceTempId) || !ids.has(targetTempId)) {
      throw new Error(`通用 draft relation ${index + 1} 使用未知 temp_id`);
    }
    if (sourceTempId === targetTempId) throw new Error(`通用 draft relation ${index + 1} 不可指向自己`);
    if (!['precedes', 'blocks'].includes(relationType)) {
      throw new Error(`通用 draft relation ${index + 1} type 不支援：${relationType || '空值'}`);
    }
    return {
      source_temp_id: sourceTempId,
      relation_type: relationType,
      target_temp_id: targetTempId,
    };
  });
}

export function validateGenericSubtaskDraft(draft = {}) {
  assertSafeDraft(draft);
  if (draft.version !== GENERIC_DRAFT_VERSION || draft.scope !== 'be') {
    throw new Error('只支援 be draft v1，Frontend draft 請使用 fe apply 流程');
  }
  if (!draft.parent || draft.parent.id === undefined || draft.parent.id === null) {
    throw new Error('Backend draft 缺少 parent snapshot');
  }
  const parent = normalizeParent(draft.parent);
  const decomposition = validateGenericDecomposition({
    parent_issue_id: parent.id,
    rationale: draft.rationale,
    sub_issues: draft.sub_issues,
  }, parent.id);
  const relations = normalizeDraftRelations(draft.relations, decomposition.sub_issues);
  return {
    version: GENERIC_DRAFT_VERSION,
    scope: 'be',
    generatedAt: text(draft.generatedAt) || null,
    parent,
    rationale: decomposition.rationale,
    defaults: draft.defaults && typeof draft.defaults === 'object' ? draft.defaults : {},
    sub_issues: decomposition.sub_issues,
    relations,
    skippedSubIssues: Array.isArray(draft.skippedSubIssues) ? draft.skippedSubIssues : [],
  };
}

export function serializeGenericSubtaskDraft(draft) {
  return JSON.stringify(validateGenericSubtaskDraft(draft), null, 2);
}

export function parseGenericSubtaskDraft(content) {
  let parsed;
  try {
    parsed = JSON.parse(String(content || ''));
  } catch (error) {
    throw new Error(`無法解析 Backend draft JSON：${error.message}`);
  }
  return validateGenericSubtaskDraft(parsed);
}

export function buildGenericParentSnapshot(parent = {}) {
  return normalizeParent(parent);
}

export function renderGenericSubIssue(subIssue) {
  return formatGenericSubtaskContent(subIssue);
}

export async function generateGenericSubtaskDraft({
  parentIssueId,
  client,
  projectId,
  trackerIdDefault,
  priorityIdDefault = null,
  modulePrefixHint = 'BE',
  issueFullText,
  maxSubtasks = 8,
  model,
  maxRetries,
  timeout,
  aiRequest,
  onProgress = () => {},
}) {
  onProgress({ phase: 'read-parent', parentIssueId });
  const parentIssue = await client.getIssue(parentIssueId, {
    include: 'children,relations,journals',
  });
  const resolvedProjectId = projectId ?? parentIssue.projectId ?? parentIssue.project?.id ?? null;
  const resolvedTrackerId = trackerIdDefault ?? parentIssue.trackerId ?? parentIssue.tracker?.id;
  if (resolvedProjectId === undefined || resolvedProjectId === null
    || resolvedTrackerId === undefined || resolvedTrackerId === null) {
    throw new Error(`Issue #${parentIssueId} 缺少建立子 Issue 需要的 project 或 tracker`);
  }
  onProgress({ phase: 'parent-read', parentIssueId, subject: parentIssue.subject });
  const analysis = await generateGenericDecomposition({
    parentIssue,
    parentIssueId,
    projectId: resolvedProjectId,
    trackerIdDefault: resolvedTrackerId,
    priorityIdDefault,
    modulePrefixHint,
    issueFullText: issueFullText || [parentIssue.subject, parentIssue.description].filter(Boolean).join('\n\n'),
    maxSubtasks,
    model,
    maxRetries,
    timeout,
    aiRequest,
    onProgress,
  });
  const subIssues = analysis.sub_issues.map(subIssue => {
    const rendered = {
      ...subIssue,
      project_id: subIssue.project_id ?? resolvedProjectId,
      tracker_id: subIssue.tracker_id ?? resolvedTrackerId,
      parent_issue_id: parentIssueId,
      priority_id: subIssue.priority_id ?? priorityIdDefault,
    };
    rendered.tracker_id = resolvedTrackerId;
    rendered.priority_id = null;
    return { ...rendered, content: formatGenericSubtaskContent(rendered) };
  });
  const relations = subIssues.flatMap(subIssue => subIssue.relations.map(relation => ({
    source_temp_id: subIssue.temp_id,
    relation_type: relation.relation_type,
    target_temp_id: relation.target_temp_id,
  })));
  return {
    version: GENERIC_DRAFT_VERSION,
    scope: 'be',
    generatedAt: new Date().toISOString(),
    parent: buildGenericParentSnapshot(parentIssue),
    rationale: analysis.rationale,
    defaults: {
      projectId: resolvedProjectId,
      trackerId: resolvedTrackerId,
      priorityId: priorityIdDefault,
    },
    sub_issues: subIssues,
    relations,
    skippedSubIssues: analysis.skipped_sub_issues || [],
  };
}

function sameParentSnapshot(expected, current) {
  const currentProjectId = current.projectId ?? current.project?.id ?? null;
  const currentTrackerId = current.trackerId ?? current.tracker?.id ?? null;
  return Number(expected.id) === Number(current.id)
    && expected.subject === text(current.subject)
    && expected.description === text(current.description)
    && (expected.projectId ?? null) === currentProjectId
    && (expected.trackerId ?? null) === currentTrackerId;
}

function issueIdFromResponse(response) {
  return response?.id ?? response?.issue?.id ?? null;
}

function getExistingRelations(issue = {}) {
  return Array.isArray(issue.relations) ? issue.relations : [];
}

function hasRelation(relations, sourceIssueId, targetIssueId, relationType) {
  return relations.some(relation => {
    const left = relation.issue_id ?? relation.issueId;
    const right = relation.issue_to_id ?? relation.issueToId;
    return relation.relation_type === relationType
      && ((Number(left) === Number(sourceIssueId) && Number(right) === Number(targetIssueId))
        || (Number(left) === Number(targetIssueId) && Number(right) === Number(sourceIssueId)));
  });
}

function buildParentIndex(parentIssueId, mappings, client) {
  const marker = `<!-- ai-git-tools:generic-subtask-index parent=${parentIssueId} -->`;
  const lines = [marker, 'Backend 子 Issue 索引：'];
  for (const mapping of mappings) {
    const link = client?.baseUrl ? ` (${client.baseUrl}/issues/${mapping.issueId})` : '';
    lines.push(`- ${mapping.tempId} -> #${mapping.issueId} ${mapping.subject}${link}`);
  }
  return lines.join('\n');
}

function hasParentIndex(parent, marker, mappings) {
  const journals = Array.isArray(parent.journals) ? parent.journals : [];
  const journalText = journals.map(journal => typeof journal === 'string'
    ? journal
    : journal?.notes || journal?.content || '').join('\n');
  return journalText.includes(marker)
    && mappings.every(mapping => journalText.includes(`${mapping.tempId} -> #${mapping.issueId}`));
}

async function loadChildDetails(client, children = []) {
  const unavailableChildIds = [];
  if (typeof client?.getIssue !== 'function') {
    return { children, unavailableChildIds: [] };
  }
  const detailedChildren = await Promise.all(children.map(async child => {
    if (child?.description || child?.id === undefined || child?.id === null) return child;
    try {
      const detail = await client.getIssue(child.id, { include: 'relations' });
      return { ...child, description: detail.description || '' };
    } catch {
      unavailableChildIds.push(child.id);
      return child;
    }
  }));
  return { children: detailedChildren, unavailableChildIds };
}

export async function applyGenericSubtaskDraft({
  draft,
  client,
  force = false,
  replace = false,
  onProgress = () => {},
}) {
  const validated = validateGenericSubtaskDraft(draft);
  const parentIssueId = validated.parent.id;
  const current = await client.getIssue(parentIssueId, {
    include: 'children,relations,journals',
  });
  if (!force && !sameParentSnapshot(validated.parent, current)) {
    return {
      blocked: true,
      reason: 'parent-conflict',
      results: [],
      relations: [],
      parentIndex: { skipped: true },
      mappings: [],
    };
  }

  const listedChildren = await client.listIssues({ parentIssueId });
  const childDetails = replace
    ? await loadChildDetails(client, listedChildren)
    : { children: listedChildren, unavailableChildIds: [] };
  if (replace && childDetails.unavailableChildIds.length > 0) {
    return {
      blocked: true,
      reason: 'child-detail-unavailable',
      childIds: childDetails.unavailableChildIds,
      results: [],
      relations: [],
      parentIndex: { skipped: true },
      mappings: [],
    };
  }
  const existingChildren = childDetails.children;
  const replaceable = replace
    ? existingChildren.filter(child => new RegExp(`<!--\\s*ai-git-tools:generic-subtask parent=${parentIssueId} temp_id=[^\\s]+\\s*-->`).test(child?.description || ''))
    : [];
  if (replace) {
    const results = [];
    const mappings = [];
    const updateCount = Math.min(replaceable.length, validated.sub_issues.length);
    for (let index = 0; index < updateCount; index += 1) {
      const existing = replaceable[index];
      const subIssue = validated.sub_issues[index];
      onProgress({
        phase: 'update-child',
        index: index + 1,
        total: validated.sub_issues.length,
        parentIssueId,
        tempId: subIssue.temp_id,
        title: subIssue.subject,
      });
      const content = subIssue.content || formatGenericSubtaskContent(subIssue);
      const input = {
        projectId: subIssue.project_id ?? validated.defaults.projectId ?? validated.parent.projectId,
        trackerId: subIssue.tracker_id ?? validated.defaults.trackerId ?? null,
        priorityId: subIssue.priority_id ?? validated.defaults.priorityId ?? null,
        categoryId: subIssue.category_id,
        estimatedHours: subIssue.estimated_hours,
        startDate: subIssue.start_date,
        dueDate: subIssue.due_date,
        subject: subIssue.subject,
        description: content,
        parentIssueId,
        customFields: subIssue.custom_fields,
      };
      try {
        await client.updateIssue(existing.id, input);
        results.push({ tempId: subIssue.temp_id, subject: subIssue.subject, issueId: existing.id, updated: true });
        mappings.push({ tempId: subIssue.temp_id, issueId: existing.id, subject: subIssue.subject });
      } catch (error) {
        results.push({ tempId: subIssue.temp_id, subject: subIssue.subject, issueId: existing.id, updated: false, error: String(error?.message || error) });
      }
    }
    for (let index = updateCount; index < validated.sub_issues.length; index += 1) {
      const subIssue = validated.sub_issues[index];
      onProgress({
        phase: 'create-child',
        index: index + 1,
        total: validated.sub_issues.length,
        parentIssueId,
        tempId: subIssue.temp_id,
        title: subIssue.subject,
      });
      const content = subIssue.content || formatGenericSubtaskContent(subIssue);
      try {
        const response = await client.createIssue({
          projectId: subIssue.project_id ?? validated.defaults.projectId ?? validated.parent.projectId,
          trackerId: subIssue.tracker_id ?? validated.defaults.trackerId ?? null,
          priorityId: subIssue.priority_id ?? validated.defaults.priorityId ?? null,
          categoryId: subIssue.category_id,
          estimatedHours: subIssue.estimated_hours,
          startDate: subIssue.start_date,
          dueDate: subIssue.due_date,
          subject: subIssue.subject,
          description: content,
          parentIssueId,
          customFields: subIssue.custom_fields,
        });
        const issueId = issueIdFromResponse(response);
        if (issueId === null || issueId === undefined) throw new Error('Redmine 回應缺少 child Issue ID');
        results.push({ tempId: subIssue.temp_id, subject: subIssue.subject, issueId, created: true });
        mappings.push({ tempId: subIssue.temp_id, issueId, subject: subIssue.subject });
      } catch (error) {
        results.push({ tempId: subIssue.temp_id, subject: subIssue.subject, created: false, error: String(error?.message || error) });
      }
    }
    const mappingByTempId = new Map(mappings.map(mapping => [mapping.tempId, mapping.issueId]));
    const relationResults = [];
    for (const relation of validated.relations) {
      const sourceIssueId = mappingByTempId.get(relation.source_temp_id);
      const targetIssueId = mappingByTempId.get(relation.target_temp_id);
      if (sourceIssueId === undefined || targetIssueId === undefined) {
        relationResults.push({ ...relation, unresolved: true });
        continue;
      }
      try {
        const sourceIssue = await client.getIssue(sourceIssueId, { include: 'relations' });
        if (hasRelation(getExistingRelations(sourceIssue), sourceIssueId, targetIssueId, relation.relation_type)) {
          relationResults.push({ ...relation, skipped: true, sourceIssueId, targetIssueId });
          continue;
        }
        await client.createRelation(sourceIssueId, { targetIssueId, relationType: relation.relation_type });
        relationResults.push({ ...relation, created: true, sourceIssueId, targetIssueId });
      } catch (error) {
        relationResults.push({ ...relation, created: false, error: String(error?.message || error) });
      }
    }
    const parentIndex = { skipped: true, reason: 'replace-mode' };
    if (mappings.length === validated.sub_issues.length
      && relationResults.every(relation => relation.created || relation.skipped)) {
      const marker = `<!-- ai-git-tools:generic-subtask-index parent=${parentIssueId} -->`;
      if (!hasParentIndex(current, marker, mappings)) {
        await client.updateIssue(parentIssueId, { notes: buildParentIndex(parentIssueId, mappings, client) });
        parentIndex.updated = true;
      } else {
        parentIndex.reason = 'already-exists';
      }
    }
    return { blocked: false, results, relations: relationResults, parentIndex, mappings };
  }
  const matches = new Map();
  for (const subIssue of validated.sub_issues) {
    const marker = getGenericManagedMarker(parentIssueId, subIssue.temp_id);
    const found = existingChildren.filter(child => child?.description?.includes(marker)
      || child?.subject === subIssue.subject);
    if (found.length > 1) {
      return {
        blocked: true,
        reason: 'ambiguous-child',
        tempId: subIssue.temp_id,
        results: [],
        relations: [],
        parentIndex: { skipped: true },
        mappings: [],
      };
    }
    matches.set(subIssue.temp_id, found[0] || null);
  }

  const results = [];
  const mappings = [];
  for (const [index, subIssue] of validated.sub_issues.entries()) {
    const existing = matches.get(subIssue.temp_id);
    onProgress({
      phase: existing ? 'update-child' : 'create-child',
      index: index + 1,
      total: validated.sub_issues.length,
      parentIssueId,
      tempId: subIssue.temp_id,
      title: subIssue.subject,
    });
    const content = subIssue.content || formatGenericSubtaskContent(subIssue);
    const input = {
      projectId: subIssue.project_id ?? validated.defaults.projectId ?? validated.parent.projectId,
      trackerId: subIssue.tracker_id ?? validated.defaults.trackerId ?? validated.parent.trackerId,
      priorityId: subIssue.priority_id ?? validated.defaults.priorityId ?? null,
      categoryId: subIssue.category_id,
      estimatedHours: subIssue.estimated_hours,
      startDate: subIssue.start_date,
      dueDate: subIssue.due_date,
      subject: subIssue.subject,
      description: content,
      parentIssueId,
      customFields: subIssue.custom_fields,
    };
    try {
      const response = existing
        ? await client.updateIssue(existing.id, input)
        : await client.createIssue(input);
      const issueId = existing?.id ?? issueIdFromResponse(response);
      if (issueId === null || issueId === undefined) throw new Error('Redmine 回應缺少 child Issue ID');
      const result = {
        tempId: subIssue.temp_id,
        subject: subIssue.subject,
        issueId,
        ...(existing ? { updated: true } : { created: true }),
      };
      results.push(result);
      mappings.push({ tempId: subIssue.temp_id, issueId, subject: subIssue.subject });
    } catch (error) {
      results.push({
        tempId: subIssue.temp_id,
        subject: subIssue.subject,
        ...(existing ? { updated: false } : { created: false }),
        error: String(error?.message || error),
      });
    }
  }

  const mappingByTempId = new Map(mappings.map(mapping => [mapping.tempId, mapping.issueId]));
  const relationResults = [];
  let relationFailed = false;
  for (const relation of validated.relations) {
    const sourceIssueId = mappingByTempId.get(relation.source_temp_id);
    const targetIssueId = mappingByTempId.get(relation.target_temp_id);
    if (sourceIssueId === undefined || targetIssueId === undefined) {
      relationFailed = true;
      relationResults.push({ ...relation, unresolved: true });
      continue;
    }
    try {
      const sourceIssue = await client.getIssue(sourceIssueId, { include: 'relations' });
      if (hasRelation(getExistingRelations(sourceIssue), sourceIssueId, targetIssueId, relation.relation_type)) {
        relationResults.push({ ...relation, skipped: true, sourceIssueId, targetIssueId });
        continue;
      }
      await client.createRelation(sourceIssueId, {
        targetIssueId,
        relationType: relation.relation_type,
      });
      relationResults.push({ ...relation, created: true, sourceIssueId, targetIssueId });
    } catch (error) {
      relationFailed = true;
      relationResults.push({ ...relation, created: false, error: String(error?.message || error) });
    }
  }

  const childFailed = results.some(result => result.created === false || result.updated === false);
  const parentIndex = { skipped: true };
  if (!childFailed && !relationFailed && mappings.length === validated.sub_issues.length) {
    const marker = `<!-- ai-git-tools:generic-subtask-index parent=${parentIssueId} -->`;
    if (!hasParentIndex(current, marker, mappings)) {
      const notes = buildParentIndex(parentIssueId, mappings, client);
      await client.updateIssue(parentIssueId, { notes });
      parentIndex.updated = true;
    } else {
      parentIndex.reason = 'already-exists';
    }
  } else {
    parentIndex.reason = 'incomplete-child-or-relation';
  }

  return { blocked: false, results, relations: relationResults, parentIndex, mappings };
}

export { getGenericManagedMarker };