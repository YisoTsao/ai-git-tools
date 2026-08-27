import { AIClient } from '../core/ai-client.js';
import { normalizeAnalysisLanguage } from '../utils/traditional-chinese.js';

const ANALYSIS_FIELDS = [
  'developmentSummary',
  'requirementDescription',
  'implementationDetails',
  'impactScope',
  'codeChanges',
  'apiChanges',
  'technicalDetails',
  'modifiedFiles',
  'verification',
  'unresolvedItems',
  'evidence',
];

function normalizeFlowcharts(value) {
  const flowcharts = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [{ source: value }]
      : value
        ? [value]
        : [];

  const usedIds = new Set();
  return flowcharts
    .filter(flowchart => flowchart && typeof flowchart === 'object')
    .map((flowchart, index) => {
      const title = typeof flowchart.title === 'string' ? flowchart.title.trim() : '';
      const requestedId = typeof flowchart.id === 'string' ? flowchart.id.trim() : '';
      const stableId = (requestedId || title || `flowchart-${index + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || `flowchart-${index + 1}`;

      let uniqueId = stableId;
      if (usedIds.has(uniqueId)) uniqueId = `${stableId}-${index + 1}`;
      usedIds.add(uniqueId);

      return {
        id: uniqueId,
        title,
        source: typeof (flowchart.source || flowchart.mermaid) === 'string'
          ? (flowchart.source || flowchart.mermaid).trim()
          : '',
        evidence: asStringArray(flowchart.evidence),
      };
    })
    .filter(flowchart => flowchart.source)
    .slice(0, 1);
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}

function asBehaviorRules(value) {
  return Array.isArray(value)
    ? value.filter(rule => rule && typeof rule.scenario === 'string' && typeof rule.behavior === 'string')
    : [];
}

function filterEvidenceBackedClaims(result, evidence = {}) {
  const source = JSON.stringify(evidence);
  const evidenceRefs = result.evidence.filter(
    reference => reference.trim() && source.includes(reference)
  );
  const changedFiles = new Set(evidence.changedFiles || []);

  return {
    ...result,
    evidence: evidenceRefs,
    apiChanges: evidenceRefs.length > 0 ? result.apiChanges : [],
    verification: evidenceRefs.length > 0 ? result.verification : [],
    modifiedFiles: result.modifiedFiles.filter(file => changedFiles.has(file)),
  };
}

/**
 * 建立單一 Redmine Issue 的 AI 分析 prompt
 * @param {{issue: object, evidence: object}} input
 * @returns {string}
 */
export function buildIssueAnalysisPrompt({ issue, evidence }) {
  return `你是資深軟體工程師，請針對指定的 Redmine Issue 分析目前的實際程式變更。

重要規則：
- 這次只分析指定的 Issue #${issue.id}，不得把結果指派給其他 Issue。
- 所有自然語言欄位必須使用台灣繁體中文，禁止輸出簡體中文。
- 只能描述下方 Issue、Git commits、changed files、diff 或 PR evidence 中有明確證據的內容。
- 不得捏造 API endpoint、參數、檔案、function、class、測試或部署結果。
- requirementDescription 必須是一句話，說明這次為什麼修改。
- implementationDetails 必須整理 3～6 個實際完成事項。
- behaviorRules 必須使用 scenario/behavior 物件描述不同情境的行為。
- impactScope 必須描述受到影響的功能、API、頁面或模組。
- 只要 Issue 或 Git evidence 能推導出頁面、API、驗證或狀態之間的實際步驟，flowcharts 必須至少產生一張 Mermaid 流程圖，不得因為已有文字摘要而省略。
- 每個 Issue 只能產生一張流程圖；flowcharts 陣列最多只能有一個元素。若有多個候選流程，請合併成一張涵蓋完整流程的圖。
- API path 不得使用大括號參數，例如 /items/{id} 必須改成 /items/:id；每張流程圖必須有穩定 id、title、source 與 evidence。
- 只有在證據不足以描述任何流程時，flowcharts 才能回傳空陣列。
- 沒有明確測試或驗證證據時，verification 必須是空陣列。
- 不要產生 suggestedStatus、coverage 或 confidence，也不要決定 Redmine status。

## 指定 Redmine Issue
${JSON.stringify(issue, null, 2)}

## 共用 Git / PR Evidence
${JSON.stringify(evidence, null, 2)}

請只回傳 JSON，不要使用 Markdown code fence，格式如下：
{
  "issueId": ${issue.id},
  "developmentSummary": [],
  "requirementDescription": "",
  "implementationDetails": [],
  "impactScope": "",
  "behaviorRules": [],
  "codeChanges": [],
  "apiChanges": [],
  "technicalDetails": [],
  "modifiedFiles": [],
  "verification": [],
  "flowcharts": [],
  "unresolvedItems": [],
  "evidence": []
}
requirementDescription 與 impactScope 必須是字串；implementationDetails 必須是 3～6 個字串的陣列；behaviorRules 必須是包含 scenario 與 behavior 字串的物件陣列；flowcharts 必須是包含 id、title、source 與 evidence 的物件陣列；其它清單欄位必須是字串陣列。`;
}

/**
 * 解析並正規化 AI 分析結果
 * @param {string} content
 * @param {number|string} issueId
 * @returns {object}
 */
export function parseIssueAnalysis(content, issueId) {
  const parsed = normalizeAnalysisLanguage(AIClient.parseJSON(content));
  const result = { issueId };

  for (const field of ANALYSIS_FIELDS) {
    result[field] = field === 'requirementDescription' || field === 'impactScope'
      ? (typeof parsed[field] === 'string' ? parsed[field].trim() : '')
      : asStringArray(parsed[field]);
  }
  result.behaviorRules = asBehaviorRules(parsed.behaviorRules);
  result.flowcharts = normalizeFlowcharts(parsed.flowcharts || parsed.flowchart);

  result.flowchart = result.flowcharts[0]?.source || null;

  return result;
}

/**
 * 針對單一 Issue 呼叫 AI
 * @param {{issue: object, evidence: object, aiClient?: typeof AIClient, model?: string, maxRetries?: number}} input
 * @returns {Promise<object>}
 */
export async function analyzeIssue({
  issue,
  evidence,
  aiClient = AIClient,
  model = 'gpt-5.6-luna',
  maxRetries = 3,
}) {
  const prompt = buildIssueAnalysisPrompt({ issue, evidence });
  const content = await aiClient.sendAndWait(prompt, model, maxRetries);
  return filterEvidenceBackedClaims(parseIssueAnalysis(content, issue.id), evidence);
}
