import inquirer from 'inquirer';
import chalk from 'chalk';
import { normalizeAnalysisLanguage, toTraditionalChinese } from '../utils/traditional-chinese.js';

function bulletSection(title, items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `### ${title}\n${items.map(item => `- ${item}`).join('\n')}\n`;
}

function paragraphSection(title, content) {
  if (!content) return '';
  return `### ${title}\n\n${content}\n`;
}

function formatRequirement(content) {
  if (!content) return '';
  return content.replace(/\s+/g, ' ').trim();
}

function getImplementationDetails(analysis = {}) {
  if (analysis.implementationDetails?.length) {
    return analysis.implementationDetails.slice(0, 6);
  }

  return [
    ...(analysis.codeChanges || []),
    ...(analysis.apiChanges || []),
    ...(analysis.technicalDetails || []),
  ].slice(0, 6);
}

function formatBehaviorRules(rules = []) {
  if (!Array.isArray(rules) || rules.length === 0) return '';
  const rows = rules
    .filter(rule => rule?.scenario && rule?.behavior)
    .map(rule => `| ${String(rule.scenario).replaceAll('|', '\\|')} | ${String(rule.behavior).replaceAll('|', '\\|')} |`);
  if (rows.length === 0) return '';
  return `### 行為規則\n\n| 情境 | 行為 |\n|---|---|\n${rows.join('\n')}\n`;
}

function formatFlowcharts(flowcharts = []) {
  if (!Array.isArray(flowcharts) || flowcharts.length === 0) return '';

  return flowcharts
    .map((flowchart, index) => {
      const mermaid = formatMermaid(flowchart?.source);
      if (!mermaid) return '';
      const id = normalizeFlowchartId(flowchart?.id, index);
      const title = flowchart?.title?.trim() || '開發流程';
      return `### 流程圖：${title}\n\n<!-- flowchart-id: ${id} -->\n${mermaid}\n`;
    })
    .filter(Boolean)
    .slice(0, 1)
    .join('\n');
}

const MERMAID_START = '<!-- ai-git-tools:mermaid:start';
const MERMAID_END = '<!-- ai-git-tools:mermaid:end';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeFlowchartId(id, index) {
  const source = typeof id === 'string' && id.trim() ? id : `flowchart-${index + 1}`;
  return source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `flowchart-${index + 1}`;
}

function normalizeFlowchartInput(flowcharts) {
  if (Array.isArray(flowcharts)) return flowcharts;
  if (typeof flowcharts === 'string' && flowcharts.trim()) {
    return [{ id: 'flowchart-1', title: '開發流程', source: flowcharts }];
  }
  return [];
}

function normalizeApiPathPlaceholders(source) {
  return source
    .split('\n')
    .map(line => {
      const containsApiPath = /(?:\b(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b|https?:\/\/|\/[^\s/]+\/)/i.test(line);
      return containsApiPath
        ? line.replace(/\{([A-Za-z][A-Za-z0-9_-]*)\}/g, ':$1')
        : line;
    })
    .join('\n');
}

function hasSameMermaid(description, mermaid) {
  const existing = description.match(/\{\{\s*mermaid\b[\s\S]*?\}\}/gi) || [];
  return existing.some(block => formatMermaid(block) === mermaid);
}

function managedFlowchartPattern(id) {
  const escapedId = escapeRegExp(id);
  return new RegExp(
    `${escapeRegExp(MERMAID_START)} id="${escapedId}" -->[\\s\\S]*?${escapeRegExp(MERMAID_END)} id="${escapedId}" -->`
  );
}

function formatManagedFlowchart(flowchart, index) {
  const mermaid = formatMermaid(flowchart.source);
  if (!mermaid) return '';

  const id = normalizeFlowchartId(flowchart.id, index);
  const title = typeof flowchart.title === 'string' && flowchart.title.trim()
    ? flowchart.title.trim()
    : '開發流程';
  return `${MERMAID_START} id="${id}" -->\n\n### 流程圖：${title}\n\n${mermaid}\n\n${MERMAID_END} id="${id}" -->`;
}

/**
 * 將 Mermaid source 包成 Redmine macro
 * @param {string|null} source
 * @returns {string}
 */
export function formatMermaid(source) {
  if (typeof source !== 'string' || !source.trim()) return '';

  let cleanSource = source.trim()
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();

  if (/^\{\{\s*mermaid\b/i.test(cleanSource)) {
    cleanSource = cleanSource
      .replace(/^\{\{\s*mermaid\s*/i, '')
      .replace(/\s*\}\}$/, '')
      .trim();
  }

  cleanSource = cleanSource.replace(/^flowchart\s+TD\b/i, 'graph TD');
  cleanSource = normalizeApiPathPlaceholders(cleanSource);

  if (
    cleanSource.includes('{{mermaid') ||
    cleanSource.includes('}}') ||
    !/^(flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|journey)\b/m.test(cleanSource)
  ) {
    return '';
  }

  return `{{mermaid\n${cleanSource}\n}}`;
}

/**
 * 將 Mermaid 放入 Redmine description 的受管理區塊
 * @param {string} description
 * @param {string|null} source
 * @returns {string}
 */
export function formatRedmineDescription(description = '', source = null) {
  let result = description;
  const flowcharts = normalizeFlowchartInput(source);

  flowcharts.forEach((flowchart, index) => {
    const mermaid = formatMermaid(flowchart?.source);
    if (!mermaid) return;

    const block = formatManagedFlowchart(flowchart, index);
    const id = normalizeFlowchartId(flowchart?.id, index);
    const markerPattern = managedFlowchartPattern(id);
    if (markerPattern.test(result)) {
      result = result.replace(markerPattern, block);
      return;
    }

    if (!hasSameMermaid(result, mermaid)) {
      result = `${result.trim()}\n\n${block}`.trim();
    }
  });

  return result;
}

/**
 * 格式化 Redmine Issue note
 * @param {{issue?: object, analysis?: object, evidence?: object, pullRequest?: object|null}} input
 * @returns {string}
 */
export function formatRedmineNote({ issue = {}, analysis = {}, evidence = {}, pullRequest = null }) {
  const localizedIssue = normalizeAnalysisLanguage(issue);
  const localizedAnalysis = normalizeAnalysisLanguage(analysis);
  const sections = ['## 開發內容', ''];
  const requirementDescription = formatRequirement(
    localizedAnalysis.requirementDescription || localizedAnalysis.developmentSummary?.[0] || localizedIssue.description || ''
  );
  const implementationDetails = getImplementationDetails(localizedAnalysis);
  const behaviorRules = formatBehaviorRules(localizedAnalysis.behaviorRules);
  const implementation = bulletSection('實作內容', implementationDetails);
  const impactScope = paragraphSection('影響範圍', localizedAnalysis.impactScope);
  const unresolved = localizedAnalysis.unresolvedItems?.length
    ? `### 待確認\n${localizedAnalysis.unresolvedItems.map(item => `- [ ] ${item}`).join('\n')}\n`
    : '';
  const flowcharts = formatFlowcharts(localizedAnalysis.flowcharts);

  sections.push(
    paragraphSection('需求說明', requirementDescription),
    implementation,
    behaviorRules,
    impactScope,
    unresolved,
    flowcharts
  );

  if (evidence.currentBranch || evidence.baseBranch || pullRequest) {
    const branch = evidence.currentBranch || '—';
    const branchUrl = evidence.repository && branch !== '—'
      ? `https://github.com/${evidence.repository}/tree/${encodeURI(branch)}`
      : '';
    const base = evidence.baseBranch || '—';
    const baseUrl = evidence.repository && base !== '—'
      ? `https://github.com/${evidence.repository}/tree/${encodeURI(base)}`
      : '';
    const gitLines = [
      '### Git',
      '',
      `- Branch：${branchUrl ? `[${branch}](${branchUrl})` : `\`\`${branch}\`\``}`,
      `- Base：${baseUrl ? `[${base}](${baseUrl})` : base}`,
    ];
    if (pullRequest) {
      gitLines.push(
        `- PR：${pullRequest.url ? `[${pullRequest.url}](${pullRequest.url})` : `#${pullRequest.number}`}`
      );
    }
    sections.push(
      gitLines.join('\n'),
      ''
    );
  }

  if (localizedAnalysis.evidence?.length) {
    sections.push(`分析依據：${localizedAnalysis.evidence.join('、')}`, '');
  }

  return sections.filter((section, index) => section || index === 1).join('\n').trim();
}

/**
 * 選取 Issue 可用的狀態清單
 * @param {object} issue
 * @param {Array<object>} fallbackStatuses
 * @returns {Array<object>}
 */
export function getAvailableStatuses(issue, fallbackStatuses = []) {
  return issue.allowedStatuses?.length ? issue.allowedStatuses : fallbackStatuses;
}

/**
 * 建立 inquirer 狀態選項
 * @param {Array<object>} statuses
 * @returns {Array<{name: string, value: number}>}
 */
export function createStatusChoices(statuses = []) {
  return statuses
    .filter(status => status?.id !== undefined && status?.name)
    .map(status => ({ name: status.name, value: status.id }));
}

/**
 * 互動選擇 Issue 更新後狀態
 * @param {object} issue
 * @param {{client: object, prompt?: Function}} options
 * @returns {Promise<{statusId: number, statusName: string}>}
 */
export async function selectIssueStatus(issue, { client, prompt = inquirer.prompt } = {}) {
  const fallbackStatuses = issue.allowedStatuses?.length ? [] : await client.getIssueStatuses();
  const statuses = getAvailableStatuses(issue, fallbackStatuses);
  const choices = createStatusChoices(statuses);
  if (choices.length === 0) throw new Error(`Issue #${issue.id} 沒有可用的 Redmine 狀態`);
  const resolvedIndex = choices.findIndex(choice => /已解決|resolved/i.test(choice.name));

  const answer = await prompt([
    {
      type: 'list',
      name: 'statusId',
      message: `Issue #${issue.id}：選擇更新後狀態`,
      choices,
      default: resolvedIndex >= 0 ? resolvedIndex : 0,
    },
  ]);
  const selected = statuses.find(status => status.id === answer.statusId);
  return { statusId: answer.statusId, statusName: selected?.name || String(answer.statusId) };
}

/**
 * 直接取得已解決狀態，不啟動互動式選單
 * @param {object} issue
 * @param {Array<object>} fallbackStatuses
 * @returns {{statusId: number, statusName: string}}
 */
export function resolveIssueStatus(issue, fallbackStatuses = []) {
  const statuses = getAvailableStatuses(issue, fallbackStatuses);
  const resolved = statuses.find(status => /已解決|resolved/i.test(status.name || ''));
  if (!resolved) throw new Error(`Issue #${issue.id} 找不到「已解決」狀態`);
  return { statusId: resolved.id, statusName: resolved.name };
}

/**
 * 產生有色 terminal preview
 * @param {Array<object>} drafts
 * @returns {string}
 */
export function formatRedminePreview(drafts = []) {
  const lines = [chalk.bold.cyan('═'.repeat(72)), chalk.bold('Redmine 更新預覽'), chalk.bold.cyan('═'.repeat(72)), ''];

  for (const draft of drafts) {
    lines.push(
      chalk.bold.cyan(`Issue #${draft.issueId}`),
      `${chalk.dim('目前狀態：')} ${toTraditionalChinese(draft.currentStatusName || draft.originalStatusName || '—')}`,
      `${chalk.green('更新狀態：')} ${toTraditionalChinese(draft.statusName || '未選擇')}`,
      draft.doneRatio !== undefined ? `${chalk.green('完成百分比：')} ${draft.doneRatio}%` : '',
      draft.dueDate ? `${chalk.green('完成日期：')} ${draft.dueDate}` : '',
      draft.customFields?.length
        ? `${chalk.green('程式碼更版進度：')} ${draft.customFields.flatMap(field => field.value || []).join('、')}`
        : '',
      '',
      draft.note,
      draft.description
        ? `${chalk.bold('description Mermaid：')}\n${draft.description}`
        : '',
      chalk.dim('─'.repeat(72)),
      ''
    );
  }

  return lines.join('\n').trim();
}
