const EMPTY_VALUE = '未指定';

function value(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function list(values) {
  if (!Array.isArray(values) || values.length === 0) return `- ${EMPTY_VALUE}`;
  return values.map(item => `- ${value(item) || EMPTY_VALUE}`).join('\n');
}

export function getGenericManagedMarker(parentIssueId, tempId) {
  return `<!-- ai-git-tools:generic-subtask parent=${parentIssueId} temp_id=${tempId} -->`;
}

export function formatGenericSubtaskContent(subIssue = {}) {
  const description = subIssue.description || {};
  const relations = Array.isArray(subIssue.relations)
    ? subIssue.relations.map(relation => `${relation.relation_type}: ${relation.target_temp_id}`)
    : [];
  const lines = [
    '## 目標',
    value(description.goal) || EMPTY_VALUE,
    '',
    '## 對應原文件章節',
    value(description.source_reference) || (Array.isArray(subIssue.source_sections)
      ? subIssue.source_sections.join('、')
      : EMPTY_VALUE),
    '',
    '## 範圍',
    '### 在範圍',
    list(description.scope_in),
    '',
    '### 不在範圍',
    list(description.scope_out),
    '',
    '## API 對應',
    list(description.api_endpoints),
    '',
    '## 驗收標準',
    list(description.acceptance_criteria),
    '',
    '## 開發順序與關聯',
    `- 順序：${subIssue.development_order ?? subIssue.developmentOrder ?? EMPTY_VALUE}`,
    list(relations),
    '',
    getGenericManagedMarker(subIssue.parent_issue_id, subIssue.temp_id),
  ];
  return lines.join('\n');
}

export function formatGenericPreview({ parent = {}, rationale = '', subIssues = [], relations = [], skippedSubIssues = [] } = {}) {
  const lines = [
    '## Redmine Backend 子 Issue 拆分預覽',
    '',
    `父 Issue：#${parent.id ?? '—'} ${value(parent.subject) || EMPTY_VALUE}`,
    '',
    '### 拆分理由',
    value(rationale) || EMPTY_VALUE,
    '',
    '### 子 Issue',
  ];
  for (const [index, subIssue] of subIssues.entries()) {
    lines.push(`${index + 1}. ${subIssue.subject || EMPTY_VALUE}`);
    lines.push(`   - temp_id：${subIssue.temp_id || EMPTY_VALUE}`);
    lines.push(`   - 原文章節：${(subIssue.source_sections || []).join('、') || EMPTY_VALUE}`);
    lines.push(`   - API：${(subIssue.description?.api_endpoints || []).join('、') || EMPTY_VALUE}`);
  }
  if (relations.length > 0) {
    lines.push('', '### Relations');
    lines.push(...relations.map(relation => `- ${relation.source_temp_id || relation.source_temp_id}: ${relation.relation_type} -> ${relation.target_temp_id}`));
  }
  if (skippedSubIssues.length > 0) {
    lines.push('', '### 已跳過項目');
    lines.push(...skippedSubIssues.map(item => `- ${item.temp_id || `第 ${item.index || '?'} 項`}：${item.reason || '無法解析'}`));
  }
  lines.push('', '預覽完成，尚未修改 Redmine。');
  return lines.join('\n');
}