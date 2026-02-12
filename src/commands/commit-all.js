/**
 * Commit All 命令
 * 
 * 智能分析所有變更並自動分組提交
 */

import chalk from 'chalk';
import { loadConfig } from '../core/config-loader.js';
import { AIClient } from '../core/ai-client.js';
import { GitOperations } from '../core/git-operations.js';
import { Logger } from '../utils/logger.js';
import { 
  handleError, 
  validateCommitMessage, 
  formatFileList,
  getProjectTypePrompt,
  getConventionalCommitsRules,
} from '../utils/helpers.js';

/**
 * 使用 AI 分析並分組變更
 */
async function analyzeAndGroupChanges(changes, config, logger) {
  logger.startSpinner('AI 正在分析變更並分組...');

  // 準備變更摘要
  const maxDiffPerFile = Math.floor(config.ai.maxDiffLength / Math.max(changes.length, 1));
  const changeSummary = changes
    .map((change, index) => {
      const diff = GitOperations.getFileDiff(change.filePath, change.isNew);
      const lines = diff.split('\n');
      const truncatedDiff = lines.slice(0, Math.min(50, maxDiffPerFile / 100)).join('\n');
      return `[檔案 ${index}] ${change.filePath}\n${
        change.isNew ? '（新檔案）' : '（已修改）'
      }\n${truncatedDiff}\n`;
    })
    .join('\n---\n\n');

  const aiClient = new AIClient(config);

  const prompt = `${getProjectTypePrompt()}

請分析以下的檔案變更，並將它們按照功能/目的分組。

**分組規則**：
1. 將相關功能的變更歸類在同一組（例如：同一個功能開發、同一個 bug 修復、相關的重構等）
2. 每組應該要有明確的主題
3. 同一個功能的元件、API、樣式應歸為同一組
4. 設定檔（config）和文件（docs）變更可以獨立成一組
5. 輸出格式為 JSON 陣列，每個元素包含：
   - group_name: 群組名稱（簡短描述，繁體中文）
   - commit_type: commit 類型（feat/fix/docs/style/refactor/test/chore/perf）
   - commit_scope: commit 影響範圍（如 api、ui、config、auth 等，選填）
   - file_indices: 屬於這組的檔案索引陣列（對應上面的 [檔案 X]）
   - description: 這組變更的詳細說明（繁體中文）

範例輸出：
[
  {
    "group_name": "新增使用者登入功能",
    "commit_type": "feat",
    "commit_scope": "auth",
    "file_indices": [0, 1, 2],
    "description": "實作使用者登入 API 和前端頁面"
  },
  {
    "group_name": "修正導航列手機版顯示",
    "commit_type": "fix",
    "commit_scope": "ui",
    "file_indices": [3, 4],
    "description": "修正導航列在手機版的顯示問題"
  }
]

檔案變更內容：
${changeSummary}

請只輸出 JSON，不要其他文字。`;

  const response = await aiClient.sendAndWait(prompt);
  await aiClient.stop();

  try {
    const groups = AIClient.parseJSON(response);
    logger.succeedSpinner(`AI 分析完成，共分為 ${groups.length} 個群組`);
    return groups;
  } catch (error) {
    logger.failSpinner('AI 分析失敗');
    throw new Error(`無法解析 AI 回應: ${error.message}`);
  }
}

/**
 * 為特定群組生成 commit message
 */
async function generateCommitMessage(group, files, config, logger) {
  const filesList = files
    .map(file => {
      const diff = GitOperations.getFileDiff(file.filePath, file.isNew);
      return `檔案: ${file.filePath}\n${diff}`;
    })
    .join('\n\n---\n\n');

  const aiClient = new AIClient(config);

  const prompt = `請根據以下資訊生成一則 commit message：

群組名稱: ${group.group_name}
Commit 類型: ${group.commit_type}
Commit 範圍: ${group.commit_scope || '未指定'}
說明: ${group.description}

檔案變更：
${filesList}

規則：
- 使用 Conventional Commits 格式：${group.commit_type}${
    group.commit_scope ? `(${group.commit_scope})` : ''
  }: <subject>
- subject 限制在 50 字內，使用繁體中文
- 如果變更複雜，可以加上 body（用空行分隔），body 使用 bullet points
- 只輸出 commit message 本身，不要其他說明
- 不要包含 markdown code block 標記（不要 \`\`\`）
- 不要加上任何引導語句

輸出格式範例：
feat(auth): 新增使用者登入功能

- 實作登入 API endpoint
- 新增登入頁面 UI
- 整合 JWT 認證機制`;

  const response = await aiClient.sendAndWait(prompt);
  await aiClient.stop();

  return AIClient.cleanResponse(response);
}

/**
 * 執行分組提交
 */
async function commitGroup(group, files, config, logger) {
  try {
    console.log(chalk.cyan(`\n📦 處理群組: ${group.group_name}`));
    console.log(`   類型: ${group.commit_type}${group.commit_scope ? `(${group.commit_scope})` : ''}`);
    console.log(`   檔案數量: ${files.length}`);

    // Reset 所有已 staged 的檔案
    GitOperations.resetStaged();

    // Add 這組的檔案
    for (const file of files) {
      console.log(`   ├─ ${file.filePath}`);
      GitOperations.addFile(file.filePath);
    }

    // 生成 commit message
    console.log(`   └─ 生成 commit message...`);
    const commitMessage = await generateCommitMessage(group, files, config, logger);

    if (!commitMessage) {
      logger.warn('無法生成 commit message，跳過此群組');
      return false;
    }

    // 驗證 commit message
    const validation = validateCommitMessage(commitMessage);
    if (!validation.valid) {
      logger.warn(`Commit message 無效（${validation.reason}），跳過此群組`);
      return false;
    }

    console.log(chalk.cyan('\n   📝 Commit Message:'));
    logger.code(commitMessage.split('\n').map(line => `   ${line}`).join('\n'));

    // 執行 commit
    await GitOperations.commit(commitMessage);
    logger.success('Commit 完成！');

    return true;
  } catch (error) {
    logger.error(`Commit 失敗: ${error.message}`);
    return false;
  }
}

/**
 * Commit All 命令處理器
 */
export async function commitAllCommand(options) {
  const logger = new Logger(options.verbose);

  try {
    logger.header('智能分析所有變更並自動提交');

    // 檢查是否在 Git 倉庫中
    if (!GitOperations.isGitRepository()) {
      logger.error('當前目錄不是 Git 倉庫');
      process.exit(1);
    }

    // 載入配置
    const config = await loadConfig(options);

    if (config.output.verbose) {
      logger.debug('配置已載入');
      logger.debug(`AI Model: ${config.ai.model}`);
    }

    // 獲取所有變更
    logger.startSpinner('掃描變更中...');
    const changes = GitOperations.getAllChanges();
    logger.succeedSpinner(`找到 ${changes.length} 個變更的檔案`);

    if (changes.length === 0) {
      logger.info('沒有需要提交的變更');
      process.exit(0);
    }

    console.log(chalk.cyan('\n📊 變更的檔案:'));
    console.log(formatFileList(changes));

    // 使用 AI 分析並分組
    const groups = await analyzeAndGroupChanges(changes, config, logger);

    if (!groups || groups.length === 0) {
      logger.error('AI 分析失敗或沒有產生分組');
      process.exit(1);
    }

    console.log(chalk.cyan('\n✅ 分組結果:'));
    groups.forEach((group, index) => {
      console.log(`   群組 ${index + 1}: ${group.group_name} (${group.commit_type})`);
      console.log(`   └─ 包含 ${group.file_indices.length} 個檔案`);
    });

    // 依序提交每個群組
    logger.header('開始執行提交');

    let successCount = 0;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupFiles = group.file_indices.map(index => changes[index]);

      const success = await commitGroup(group, groupFiles, config, logger);
      if (success) {
        successCount++;
      }
    }

    // 顯示摘要
    logger.header(`完成！成功提交 ${successCount}/${groups.length} 個群組`);

    // 顯示最近的 commits
    console.log(chalk.cyan('\n📋 最近的 commits:'));
    const recentCommits = GitOperations.getRecentCommits(successCount);
    console.log(recentCommits);

    // Reset 任何剩餘的 staged 檔案
    GitOperations.resetStaged();

  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}
