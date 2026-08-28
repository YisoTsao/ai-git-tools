import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { loadConfig } from '../core/config-loader.js';
import { RedmineClient } from '../redmine/redmine-client.js';
import { buildRedmineConfig } from '../redmine/config.js';
import {
  applyGenericSubtaskDraft,
  generateGenericSubtaskDraft,
  parseGenericSubtaskDraft,
  serializeGenericSubtaskDraft,
} from '../redmine/generic-subtask-sync.js';
import {
  applySubtaskDraft,
  generateSubtaskDraft,
  parseSubtaskDraft,
  serializeSubtaskDraft,
} from '../redmine/subtask-sync.js';
import { formatGenericPreview } from '../redmine/generic-subtask-formatters.js';
import { formatSubtaskPreview } from '../redmine/subtask-formatters.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger();
const DEFAULT_SUBTASK_AI_TIMEOUT = 300000;

export function getRedmineSubtaskTimeout(config = {}) {
  const configured = Number(config.ai?.redmineSubtaskTimeout);
  return configured > 0 ? configured : DEFAULT_SUBTASK_AI_TIMEOUT;
}

function normalizeIssueOptions(issue) {
  return Array.isArray(issue) ? issue : issue === undefined ? [] : [issue];
}

export function validateRedmineSubtaskOptions(options = {}) {
  const scope = options.scope || 'fe';
  if (options.apply && options.preview) throw new Error('--apply 與 --preview 不可同時使用');
  if (options.apply && !options.from) throw new Error('--apply 必須搭配 --from <file> 使用');
  if (options.from && !options.apply) throw new Error('--from 只能搭配 --apply 使用');
  if (options.output && !options.preview) throw new Error('--output 只能搭配 --preview 使用');
  if (options.resume && !options.preview) throw new Error('--resume 只能搭配 --preview 使用');
  if (options.force && !options.apply) throw new Error('--force 只能搭配 --apply 使用');
  if (options.replace && !options.apply) throw new Error('--replace 只能搭配 --apply 使用');
  if (options.scope !== undefined && !['fe', 'be'].includes(options.scope)) {
    throw new Error('scope 目前只支援 fe 或 be');
  }
  if (scope !== 'be' && options.modulePrefixHint) {
    throw new Error('--module-prefix-hint 只能搭配 --scope be 使用');
  }
  if (scope === 'be' && options.resume) {
    throw new Error('--resume 目前只支援 fe scope');
  }
  if (!options.apply && !options.preview) {
    throw new Error('請使用 --preview 產生草稿，確認後再使用 --apply --from <file>');
  }

  const issueIds = normalizeIssueOptions(options.issue);
  if (issueIds.length > 1) throw new Error('redmine-subtasks 只允許指定一個 parent Issue');
  if (options.apply && issueIds.length > 0) {
    throw new Error('--issue 只能搭配 --preview 使用，apply 請以 draft 的 parent 為準');
  }
  if (!options.apply && issueIds.length === 0 && !options.resume) throw new Error('preview 模式需要 --issue <id> 或 --resume <file>');
  const invalidIssueIds = issueIds.filter(id => !/^[1-9]\d*$/.test(String(id)));
  if (invalidIssueIds.length > 0) throw new Error(`Issue ID 必須是正整數：${invalidIssueIds.join('、')}`);

  if (options.maxSubtasks !== undefined) {
    const maxSubtasks = Number(options.maxSubtasks);
    if (!Number.isInteger(maxSubtasks) || maxSubtasks < 1 || maxSubtasks > 12) {
      throw new Error('maxSubtasks 必須是 1 到 12 的整數');
    }
  }
}

export function formatSubtaskProgress(progress = {}) {
  switch (progress.phase) {
    case 'read-parent':
      return `讀取 Redmine Issue #${progress.parentIssueId}...`;
    case 'parent-read':
      return `主 Issue #${progress.parentIssueId} 已讀取：${progress.subject || '無標題'}`;
    case 'analyze-subtasks':
      return `分析 Issue #${progress.parentIssueId} 的功能／頁面大項...`;
    case 'outline-analysis':
      return `先整理 Issue #${progress.parentIssueId} 的子任務清單...`;
    case 'outline-request':
      return `[${progress.attempt}/${progress.total}] 等待 AI 回傳子任務清單...`;
    case 'outline-retry':
      return `[${progress.attempt}/${progress.total}] 子任務清單驗證失敗，準備重試：${progress.error || '未知錯誤'}`;
    case 'subtask-analysis':
      return `[${progress.index}/${progress.total}] 產生子任務：${progress.title || '無標題'}...`;
    case 'subtask-analyzed':
      return `[${progress.index}/${progress.total}] 子任務已完成：${progress.title || '無標題'}`;
    case 'scope-analysis':
      return `分析 Issue #${progress.parentIssueId} 的 Frontend scope...`;
    case 'generic-analysis':
      return `[${progress.attempt}/${progress.total}] 分析 Backend 子 Issue...`;
    case 'subtasks-analyzed':
      return `已產生 ${progress.count} 個子任務候選`;
    case 'screen-enrichment':
      return `[${progress.index}/${progress.total}] 整理 screen wireframe...`;
    case 'create-child':
      return `[${progress.index}/${progress.total}] 建立子任務：${progress.title || '無標題'}`;
    case 'update-child':
    case 'replace-child':
      return `[${progress.index}/${progress.total}] 更新子任務：${progress.title || '無標題'}`;
    case 'subtask-retry':
      return `[${progress.index}/${progress.total}] 子任務驗證失敗，重試第 ${progress.attempt}/${progress.maxRetries} 次：${progress.error || '未知錯誤'}`;
    case 'subtask-fallback':
      return `[${progress.index}/${progress.total}] AI detail 未完成，已先保存最小可審核草稿：${progress.title || '無標題'}`;
    case 'preview':
      return '預覽完成，尚未修改 Redmine';
    default:
      return '';
  }
}

function printProgress(progress) {
  const message = formatSubtaskProgress(progress);
  if (!message) return;
  if (['parent-read', 'subtasks-analyzed', 'preview'].includes(progress.phase)) {
    logger.success(message);
  } else {
    logger.step(message);
  }
}

function printGenericApplyResults(result) {
  for (const item of result.results || []) {
    if (item.created) console.log(`✅ 子任務「${item.subject}」已建立：#${item.issueId}`);
    else if (item.updated) console.log(`✅ 子任務「${item.subject}」已更新：#${item.issueId}`);
    else console.log(`❌ 子任務「${item.subject}」處理失敗：${item.error || '未知錯誤'}`);
  }
  for (const relation of result.relations || []) {
    if (relation.created) console.log(`✅ relation ${relation.source_temp_id} -> ${relation.target_temp_id} 已建立`);
    else if (relation.skipped) console.log(`⚠️ relation ${relation.source_temp_id} -> ${relation.target_temp_id} 已存在`);
    else if (relation.unresolved || relation.created === false) {
      console.log(`❌ relation ${relation.source_temp_id} -> ${relation.target_temp_id} 處理失敗`);
    }
  }
  if (result.blocked) console.log(`❌ 主 Issue #${result.parentIssueId || '—'} 已停止：${result.reason}`);
  else if (result.parentIndex?.updated) console.log('✅ 父 Issue 子任務索引已更新');
  else if (result.parentIndex?.reason === 'already-exists') console.log('⚠️ 父 Issue 子任務索引已存在');
}

function printFrontendApplyResults(results) {
  for (const item of results) {
    if (item.updated) console.log(`✅ 子任務「${item.title}」已更新：#${item.childId || '—'}`);
    else if (item.created) console.log(`✅ 子任務「${item.title}」已建立：#${item.childId || '—'}`);
    else if (item.skipped) console.log(`⚠️ 子任務「${item.title}」已略過：${item.reason || 'duplicate'}`);
    else if (item.blocked) console.log(`❌ 主 Issue #${item.parentIssueId || '—'} 已停止：${item.reason || 'conflict'}`);
    else console.log(`❌ 子任務「${item.title}」處理失敗：${item.error || '未知錯誤'}`);
  }
}

export async function redmineSubtasksCommand(options = {}) {
  validateRedmineSubtaskOptions(options);
  logger.header('Redmine Issue 子任務拆分');
  const config = await loadConfig();
  const redmineConfig = buildRedmineConfig(config, process.env);
  const client = new RedmineClient(redmineConfig);
  const aiTimeout = getRedmineSubtaskTimeout(config);
  logger.step(`AI 單項 timeout：${aiTimeout}ms（${aiTimeout / 1000} 秒）`);
  const scope = options.scope || 'fe';

  if (options.apply) {
    logger.step(`讀取已審核草稿：${options.from}`);
    const content = readFileSync(options.from, 'utf-8');
    if (scope === 'be') {
      const draft = parseGenericSubtaskDraft(content);
      const result = await applyGenericSubtaskDraft({ draft, client, force: options.force, replace: options.replace, onProgress: printProgress });
      printGenericApplyResults(result);
      return result;
    }
    const draft = parseSubtaskDraft(content);
    const results = await applySubtaskDraft({ draft, client, force: options.force, replace: options.replace, onProgress: printProgress });
    printFrontendApplyResults(results);
    return results;
  }

  let resumeDraft = null;
  if (options.resume) {
    logger.step(`讀取未完成草稿：${options.resume}`);
    resumeDraft = parseSubtaskDraft(readFileSync(options.resume, 'utf-8'));
    if (resumeDraft.isComplete !== false) {
      throw new Error('--resume 需要 isComplete=false 的 partial draft');
    }
  }
  const [requestedParentIssueId] = normalizeIssueOptions(options.issue);
  const parentIssueId = requestedParentIssueId || resumeDraft?.parent?.id;
  if (!parentIssueId) throw new Error('preview 模式需要 --issue <id> 或 partial draft 的 parent ID');
  const draftOutput = options.output || options.resume;
  if (scope !== 'be') {
    if (draftOutput) mkdirSync(dirname(draftOutput), { recursive: true });
    const draft = await generateSubtaskDraft({
      parentIssueId,
      client,
      maxSubtasks: options.maxSubtasks === undefined ? 8 : Number(options.maxSubtasks),
      repositoryContext: config.frontend?.repositoryContext || {},
      model: config.ai.model,
      maxRetries: config.ai.maxRetries,
      timeout: aiTimeout,
      onProgress: printProgress,
      resumeDraft,
      onPartialDraft: async snapshot => {
        if (!draftOutput) return;
        writeFileSync(draftOutput, serializeSubtaskDraft(snapshot), 'utf-8');
        console.log(`已保存部分草稿：${snapshot.completedSubtasks.length} 個子任務，待完成 ${snapshot.pendingSubtasks.length} 個`);
      },
    });
    console.log(formatSubtaskPreview({
      parent: draft.parent,
      candidates: draft.subtasks,
      scopeDecision: draft.scopeDecision,
      evidence: draft.evidence,
      analysisScope: draft.analysisScope,
    }));
    printProgress({ phase: 'preview' });
    if (draftOutput) {
      writeFileSync(draftOutput, serializeSubtaskDraft(draft), 'utf-8');
      console.log(`預覽草稿已保存：${draftOutput}`);
      console.log(`請使用 --apply --from ${draftOutput} 套用。`);
    }
    return draft;
  }
  const draft = await generateGenericSubtaskDraft({
    parentIssueId,
    client,
    modulePrefixHint: options.modulePrefixHint || 'BE',
    maxSubtasks: options.maxSubtasks === undefined ? 8 : Number(options.maxSubtasks),
    model: config.ai.model,
    maxRetries: config.ai.maxRetries,
    timeout: aiTimeout,
    onProgress: printProgress,
  });
  console.log(formatGenericPreview({
    parent: draft.parent,
    rationale: draft.rationale,
    subIssues: draft.sub_issues,
    relations: draft.relations,
    skippedSubIssues: draft.skippedSubIssues,
  }));
  printProgress({ phase: 'preview' });
  if (options.output) {
    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, serializeGenericSubtaskDraft(draft), 'utf-8');
    console.log(`預覽草稿已保存：${options.output}`);
    console.log(`請使用 --scope be --apply --from ${options.output} 套用。`);
  }
  return draft;
}

export function hasSubtaskFailures(result = {}) {
  return result.blocked || (result.results || []).some(item => item.created === false || item.updated === false);
}