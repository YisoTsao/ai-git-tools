const MERMAID_PATTERN =
  /^(flowchart|graph|sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram|journey)\b/m;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function markerValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/-->/g, '');
}

function bullets(values, mapper = item => text(item)) {
  const output = array(values).map(mapper).filter(Boolean);
  return output.length > 0 ? output.map(item => `- ${item}`).join('\n') : '';
}

function itemText(item) {
  if (typeof item === 'string') return text(item);
  return text(item?.text || item?.description || item?.value);
}

export function normalizeSubtaskTitle(value) {
  const original = text(value);
  let title = original;
  let previous;
  do {
    previous = title;
    title = title.replace(/^(?:實作|擴充)\s*[:：\-－—]?\s*/, '').trim();
  } while (title !== previous);
  return title || original;
}

function markdownCell(value) {
  return String(value ?? '—')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
}

function markdownTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map(row => `| ${row.map(markdownCell).join(' | ')} |`);
  return [head, divider, ...body].join('\n');
}

function normalizeMermaid(source) {
  return text(source).replace(/(\/[^\s()[\]]*?)\{([A-Za-z][A-Za-z0-9_-]*)\}/g, '$1:$2');
}

function formatMermaid(mermaid = {}, flowcharts = []) {
  const current = mermaid && typeof mermaid === 'object' ? mermaid : {};
  const diagrams =
    current.diagram || current.source
      ? [current]
      : current.status || current.reason
        ? [current]
        : array(flowcharts).map(flowchart => ({
            id: flowchart.id,
            title: flowchart.title,
            diagram: flowchart.source,
            status: 'ready',
            reason: '',
          }));
  const sections = [];
  for (const diagram of diagrams) {
    const source = normalizeMermaid(diagram.diagram || diagram.source);
    const supported = !source || MERMAID_PATTERN.test(source);
    const status = supported
      ? text(diagram.status) || (source ? 'ready' : 'not-supported')
      : 'unknown';
    sections.push(
      `### ${text(diagram.title) || '流程圖'}\n- ID：${text(diagram.id) || '未提供'}\n- Status：${status}`
    );
    if (source && supported && status === 'ready') sections.push(`{{mermaid\n${source}\n}}`);
    if (status !== 'ready') {
      sections.push(
        `- 原因：${text(diagram.reason) || (!supported ? '不支援的 Mermaid diagram type' : '沒有可驗證的流程圖')}`
      );
    }
  }
  return sections.join('\n\n');
}

function formatLegacyContent({ subtask = {}, parentIssueId }) {
  const lines = [
    '## 目的',
    text(subtask.purpose) || text(subtask.requirementDescription),
    '',
    '## 工作範圍',
    bullets(subtask.inScope),
  ];
  if (array(subtask.outOfScope).length > 0) {
    lines.push('', '### 不在範圍', bullets(subtask.outOfScope));
  }
  if (array(subtask.implementationDetails).length > 0) {
    lines.push('', '## 實作重點', bullets(subtask.implementationDetails));
  }
  if (array(subtask.behaviorRules).length > 0) {
    lines.push(
      '',
      '## 行為規則',
      bullets(subtask.behaviorRules, item => {
        if (typeof item === 'string') return text(item);
        return [text(item.scenario), text(item.behavior)].filter(Boolean).join('：');
      })
    );
  }
  const dependencies = [...array(subtask.dependsOnKeys), ...array(subtask.dependsOnIds)];
  const unresolved = array(subtask.unresolvedItems);
  if (dependencies.length > 0 || unresolved.length > 0) {
    lines.push('', '## 依賴與待確認');
    if (dependencies.length > 0) lines.push(`- 依賴：${dependencies.join('、')}`);
    if (unresolved.length > 0) lines.push(bullets(unresolved));
  }
  const mermaid = formatMermaid(subtask.mermaid, subtask.flowcharts);
  if (mermaid) lines.push('', mermaid);
  if (text(subtask.wireframe)) lines.push('', '## Wireframe', '```text', subtask.wireframe, '```');
  lines.push('', `<!-- ${buildManagedSubtaskKey(parentIssueId, subtask.key || subtask.id)} -->`);
  return lines.filter(line => line !== undefined).join('\n');
}

function formatUserFlow(userFlow) {
  const flows = array(userFlow).map(item => (typeof item === 'string' ? { action: item } : item));
  if (flows.length === 0) return '- 未提供';
  const rows = flows.map(flow => {
    return [flow.step || '—', flow.action || '未提供', flow.systemResponse || '未提供'];
  });
  return markdownTable(['步驟', '操作 (Action)', '系統回應 (System Response)'], rows);
}

function jsonCode(value) {
  return ['```json', JSON.stringify(value ?? {}, null, 2), '```'].join('\n');
}

function exampleCode(value) {
  if (!text(value)) return '';
  try {
    return jsonCode(JSON.parse(value));
  } catch {
    return ['```text', text(value), '```'].join('\n');
  }
}

function formatJsonSection(title, value) {
  return [`#### ${title}`, jsonCode(value)];
}

function formatApi(api, requestResponse = []) {
  const mapping = requestResponse.find(item => item.apiId === api.id) || {};
  const lines = [
    `### API：${api.id || '未命名'}`,
    `- Method：${api.method || '未提供'}`,
    `- Base URL：${api.baseUrl || '未提供'}`,
    `- Path：${api.path ? `\`${api.path}\`` : '未提供'}`,
    `- Purpose：${api.purpose || '未提供'}`,
    `- Auth：${api.auth || '未提供'}`,
    `- Completeness：${api.completeness || 'not-mentioned'}`,
    '',
    ...formatJsonSection('Request', api.request),
    '',
    ...formatJsonSection('Response', api.response),
  ];
  const requestExample = exampleCode(mapping.requestExample);
  const responseExample = exampleCode(mapping.responseExample);
  if (requestExample) lines.push('', '#### Request Example', requestExample);
  if (responseExample) lines.push('', '#### Response Example', responseExample);
  if (array(api.statusCodes).length > 0)
    lines.push('', ...formatJsonSection('Status Codes', api.statusCodes));
  if (array(api.errors).length > 0) lines.push('', ...formatJsonSection('Errors', api.errors));
  if (api.pagination !== null && api.pagination !== undefined)
    lines.push('', ...formatJsonSection('Pagination', api.pagination));
  if (api.filtering !== null && api.filtering !== undefined)
    lines.push('', ...formatJsonSection('Filtering', api.filtering));
  if (api.sorting !== null && api.sorting !== undefined)
    lines.push('', ...formatJsonSection('Sorting', api.sorting));
  return lines.join('\n');
}

function boundaryLabel(value) {
  const content = itemText(value);
  if (/推播任務|推播管理|推播流程/.test(content)) return '推播管理';
  if (/範本/.test(content)) return '範本管理';
  if (/額度|儲值|付款/.test(content)) return '額度與儲值';
  if (/P5|客戶詳情|客戶.*歷程/.test(content)) return '客戶詳情 (P5)';
  if (/架構|Bearer|RBAC|錯誤|Responsive|響應式|TanStack|Idempotency|冪等/.test(content)) return '架構與基底';
  return 'Frontend';
}

function formatBoundaryItem(value) {
  const content = itemText(value);
  if (!content) return '';
  const explicit = content.match(/^([^：:]+)[：:]\s*(.+)$/);
  const label = explicit ? explicit[1].trim() : boundaryLabel(value);
  const detail = explicit ? explicit[2].trim() : content;
  return `* **${label}**：${detail}`;
}

function outOfScopeDomain(value) {
  const content = itemText(value);
  if (/Backend|後端|資料庫|Scheduler|背景派送|綠界/.test(content)) return 'Backend';
  if (/Mobile|行動裝置|原生/.test(content)) return 'Mobile';
  if (/QA|DevOps|部署|CI\/CD|基礎設施|測試執行/.test(content)) return 'QA / DevOps';
  return 'Frontend';
}

function formatOutOfScope(items) {
  const rows = array(items).map(item => [
    `**${outOfScopeDomain(item)}**`,
    itemText(item),
  ]).filter(([, content]) => content);
  return rows.length > 0
    ? markdownTable(['領域', '排除項目'], rows)
    : '| 領域 | 排除項目 |\n| --- | --- |\n| — | 未提供 |';
}

function functionalLabel(item, index) {
  const explicit = text(item?.title || item?.name || item?.label);
  if (explicit) return explicit;
  const content = itemText(item);
  if (/API|呼叫|endpoint|push_history/i.test(content)) return 'API 整合';
  if (/排序|新到舊|時間/.test(content)) return '排序機制';
  if (/欄位|呈現|顯示/.test(content)) return '欄位呈現';
  if (/導向|查看任務|路由/.test(content)) return '任務導向';
  if (/資安|隱私|禁止|敏感/.test(content)) return '資安隱私';
  if (/Skeleton|Empty|錯誤|401|403|狀態/.test(content)) return 'UI/UX 狀態';
  return "功能";
}

function formatFunctionalRequirements(items) {
  const rows = array(items).map((item, index) => {
    const content = itemText(item);
    const explicitDetail = text(item?.description || item?.detail || item?.specification);
    return [
      `**${index + 1}**`,
      `**${functionalLabel(item, index)}**`,
      explicitDetail || content,
    ];
  }).filter(([, , content]) => content);
  return rows.length > 0
    ? markdownTable(['No.', '項目', '詳細規格與行為'], rows)
    : '| No. | 項目 | 詳細規格與行為 |\n| :-: | :--- | :--- |\n| — | — | 未提供 |';
}

function formatChecklist(subtask) {
  const items = array(subtask.acceptanceCriteria).map(itemText).filter(Boolean);
  return [
    '## Issue Checklist',
    items.length > 0 ? items.map(item => `- [ ] ${item}`).join('\n') : '- [ ] 未提供驗收項目',
  ].join('\n\n');
}

function formatV2Content({ subtask = {}, parentIssueId, scopeDecision = {} }) {
  const title = normalizeSubtaskTitle(subtask.title) || '未命名子任務';
  const lines = [
    `# 前端規格與子任務規劃：${title}`,
    '',
    '## 邊界與範疇 (Boundaries & Scope)',
    '',
    '### 全案 Frontend 範疇與包含項目',
    array(scopeDecision.includedRequirements).map(formatBoundaryItem).filter(Boolean).join('\n') || '* **Frontend**：未提供',
    '',
    // '### 系統不涵蓋範圍 (Out-of-Scope)',
    // formatOutOfScope(scopeDecision.excludedRequirements),
    // '',
    '## 需求與功能清單',
    '',
    text(subtask.requirementDescription) || '未提供',
    '',
    '### 核心功能清單 (Functional Requirements)',
    '',
    formatFunctionalRequirements(subtask.functionalRequirements),
    '',
    '## 使用者流程與 Mermaid 流程圖',
    '',
    '### User Flow',
    '',
    formatUserFlow(subtask.userFlow),
    '',
    formatMermaid(subtask.mermaid, subtask.flowcharts) || '- 未提供',
  ];
  if (array(subtask.apiContract).length > 0) {
    lines.push(
      '',
      '## API Contracts',
      ...subtask.apiContract
        .map(api => formatApi(api, subtask.requestResponse))
        .join('\n\n')
        .split('\n')
    );
  }
  lines.push('', formatChecklist(subtask));
  lines.push('', `<!-- ${buildManagedSubtaskKey(parentIssueId, subtask.id)} -->`);
  return lines.filter(line => line !== undefined).join('\n');
}

export function buildManagedSubtaskKey(parentIssueId, subtaskId) {
  return `ai-git-tools:redmine-subtask parent=${markerValue(parentIssueId)} key=${markerValue(subtaskId)}`;
}

export function getManagedSubtaskKey(content = '') {
  const match = String(content).match(
    /<!--\s*(ai-git-tools:redmine-subtask parent=[^\s]+ key=[^\s]+)\s*-->/
  );
  return match ? match[1] : '';
}

export function formatSubtaskContent(options = {}) {
  const subtask = options.subtask || {};
  return subtask.id || subtask.type || subtask.uiWireframe
    ? formatV2Content(options)
    : formatLegacyContent(options);
}

export function formatSubtaskPreview({
  parent = {},
  candidates = [],
  scopeDecision,
  evidence = [],
  analysisScope,
} = {}) {
  const lines = [
    `## Redmine 子任務拆分預覽：Issue #${parent.id || '—'} ${text(parent.subject)}`,
    '',
    `分析範圍：${analysisScope === 'frontend' ? 'Frontend' : analysisScope || 'Frontend'}`,
  ];
  if (scopeDecision) {
    lines.push(`Scope：${scopeDecision.status || '未提供'}`);
    lines.push(
      `依據：${
        array(scopeDecision.includedRequirements)
          .map(item => item.id || item.quote)
          .join('、') || '未提供'
      }`
    );
  }
  if (array(parent.children).length > 0) {
    lines.push(
      '',
      '### 既有 children',
      ...parent.children.map(child => `- #${child.id} ${child.subject}`)
    );
  }
  lines.push('', '### 候選子任務');
  for (const [index, candidate] of candidates.entries()) {
    lines.push(
      `${index + 1}. ${normalizeSubtaskTitle(candidate.title || candidate.subject || '未命名')}`
    );
    if (candidate.id) lines.push(`   - ID：${candidate.id}`);
    if (candidate.type) lines.push(`   - Type：${candidate.type}`);
    if (candidate.developmentOrder) lines.push(`   - 開發順序：${candidate.developmentOrder}`);
    if (candidate.route?.length)
      lines.push(`   - Routes：${candidate.route.map(route => route.path || route.id).join('、')}`);
    if (candidate.apiContract)
      lines.push(
        `   - API completeness：${candidate.apiContract.map(api => api.completeness || 'not-mentioned').join('、') || '無'}`
      );
    if (candidate.unresolvedItems?.length)
      lines.push(`   - 待確認：${candidate.unresolvedItems.join('、')}`);
  }
  if (evidence.length > 0) lines.push('', `Evidence：${evidence.map(item => item.id).join('、')}`);
  lines.push('', '尚未修改 Redmine。');
  return lines.join('\n');
}
