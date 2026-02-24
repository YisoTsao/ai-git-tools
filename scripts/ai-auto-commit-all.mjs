/* eslint-disable no-continue */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { CopilotClient } from '@github/copilot-sdk';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { loadCommitConfig } from './commit-modules/config-loader.mjs';

/**
 * 智能分析所有變更並自動分類提交
 * 會將相關功能的變更歸類到同一個 commit
 * 用法：node scripts/ai-auto-commit-all.mjs [選項]
 *
 * 選項：
 *   --model <model>          指定 AI 模型 (預設: 從配置檔讀取或 gpt-4.1)
 *   --verbose, -v            顯示詳細輸出
 *   --max-diff <number>      最大 diff 長度 (預設: 8000)
 *   --help, -h               顯示幫助訊息
 */

/**
 * 獲取檔案的變更內容
 */

function getFileDiff(filePath, isNew, isDeleted) {
  try {
    if (isDeleted) {
      // 刪除的檔案：顯示刪除前的內容（前 50 行）
      const diff = execSync(`git show HEAD:"${filePath}"`, {
        encoding: 'utf-8',
      }).toString();
      const lines = diff.split('\n').slice(0, 50);
      return `[已刪除]\n${lines.join('\n')}${lines.length >= 50 ? '\n...' : ''}`;
    }
    if (isNew) {
      // 新檔案：讀取完整內容（前 100 行）
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 100);
      return `[新檔案]\n${lines.join('\n')}${lines.length >= 100 ? '\n...' : ''}`;
    }
    // 已存在檔案：獲取 diff
    const diff = execSync(`git diff HEAD -- "${filePath}"`, {
      encoding: 'utf-8',
    }).toString();
    return diff || '[無變更]';
  } catch (error) {
    return `[讀取錯誤: ${error.message}]`;
  }
}

/**
 * 獲取所有未提交的變更
 */
function getAllChanges() {
  try {
    // 獲取已修改和新增的檔案
    const status = execSync('git status --porcelain', {
      encoding: 'utf-8',
    }).toString();

    if (!status.trim()) {
      return [];
    }

    const changes = [];
    const lines = status.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const statusCode = line.substring(0, 2);
      const filePath = line.substring(3).trim();

      // 跳過某些不需要提交的檔案
      if (
        filePath.includes('node_modules/') ||
        filePath.includes('.next/') ||
        filePath.includes('dist/') ||
        filePath.includes('.DS_Store')
      ) {
        continue;
      }

      const isNew = statusCode.includes('?') || statusCode.includes('A');
      const isDeleted = statusCode.includes('D');
      const isStaged = statusCode[0] !== ' ' && statusCode[0] !== '?';

      changes.push({
        filePath,
        isNew,
        isDeleted,
        isStaged,
        statusCode,
      });
    }

    return changes;
  } catch (error) {
    console.error('獲取變更列表失敗:', error.message);
    return [];
  }
}

/**
 * 使用 AI 分析並分組變更
 */
async function analyzeAndGroupChanges(changes, config) {
  console.log('🤖 正在使用 AI 分析變更並分組...\n');

  // 準備變更摘要（限制每個檔案的 diff 長度）
  const maxDiffPerFile = Math.floor(config.ai.maxDiffLength / Math.max(changes.length, 1));
  const changeSummary = changes
    .map((change, index) => {
      const diff = getFileDiff(change.filePath, change.isNew, change.isDeleted);
      const lines = diff.split('\n');
      const truncatedDiff = lines.slice(0, Math.min(50, maxDiffPerFile / 100)).join('\n');
      let status = '（已修改）';
      if (change.isNew) status = '（新檔案）';
      if (change.isDeleted) status = '（已刪除）';
      return `[檔案 ${index}] ${change.filePath}\n${status}\n${truncatedDiff}\n`;
    })
    .join('\n---\n\n');

  const client = new CopilotClient();
  const session = await client.createSession({
    model: config.ai.model,
  });

  const response = await session.sendAndWait({
    prompt: `你是一個資深前端工程師，熟悉 Next.js 專案的開發規範。請分析以下的檔案變更，並將它們按照功能/目的分組。

**專案背景**：
- Next.js 12+ (Pages Router)
- TypeScript + JavaScript 混合
- Tailwind CSS + Styled Components
- Zustand (客戶端狀態) + SWR (伺服器資料獲取)
- React Hook Form + Zod (表單處理)
- 架構：Modified Atomic Design（UI / Page / Feature 三層）

**專案目錄結構參考**：
- pages/ → 頁面路由
- components/Page/ → 頁面級元件
- components/UI/ 或 components/Common/ → 共用 UI 元件
- components/[Feature]/ → 功能模組元件
- store/ → Zustand 狀態管理
- api/ → API 呼叫
- utils/ → 工具函數
- styles/ → 全域樣式

規則：
1. 將相關功能的變更歸類在同一組（例如：同一個功能開發、同一個 bug 修復、相關的重構等）
2. 每組應該要有明確的主題
3. 同一個功能的元件、API、store、樣式應歸為同一組
4. 設定檔（config）和文件（docs）變更可以獨立成一組
5. 輸出格式為 JSON 陣列，每個元素包含：
   - group_name: 群組名稱（簡短描述，繁體中文）
   - commit_type: commit 類型（feat/fix/docs/style/refactor/test/chore/perf）
   - commit_scope: commit 影響範圍（如 member、report、auth、api、ui、config）
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

請只輸出 JSON，不要其他文字。`,
  });

  await client.stop();

  const content = response?.data.content?.trim() || '';

  // 嘗試解析 JSON
  try {
    // 移除可能的 markdown code block 標記
    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const groups = JSON.parse(jsonContent);
    return groups;
  } catch (error) {
    console.error('❌ 無法解析 AI 回應:', error.message);
    console.log('原始回應:', content);
    return null;
  }
}

/**
 * 為特定群組生成 commit message
 */
async function generateCommitMessage(group, files, config) {
  const client = new CopilotClient();
  const session = await client.createSession({
    model: config.ai.model,
  });

  const filesList = files
    .map((file) => {
      const diff = getFileDiff(file.filePath, file.isNew, file.isDeleted);
      let status = '修改';
      if (file.isNew) status = '新增';
      if (file.isDeleted) status = '刪除';
      return `檔案: ${file.filePath} [${status}]\n${diff}`;
    })
    .join('\n\n---\n\n');

  const response = await session.sendAndWait({
    prompt: `請根據以下資訊生成一則 commit message：

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
- 整合 JWT 認證機制`,
  });

  await client.stop();

  // 清理可能的 markdown code block 標記
  let commitMessage = response?.data.content?.trim() || '';
  commitMessage = commitMessage
    .replace(/^```[\s\S]*?\n/, '')
    .replace(/\n```$/, '')
    .trim();

  return commitMessage;
}

/**
 * 執行分組提交
 */
async function commitGroup(group, files, config) {
  try {
    console.log(`\n📦 處理群組: ${group.group_name}`);
    console.log(
      `   類型: ${group.commit_type}${group.commit_scope ? `(${group.commit_scope})` : ''}`
    );
    console.log(`   檔案數量: ${files.length}`);

    // 先 reset 所有已 staged 的檔案
    try {
      execSync('git reset HEAD -- .', { stdio: 'ignore' });
    } catch (e) {
      // 忽略錯誤（可能沒有 staged 的檔案）
    }

    // Add 這組的檔案（使用 try-finally 確保失敗時清理）
    const addedFiles = [];
    try {
      for (const file of files) {
        const fileStatus = file.isNew ? '新增' : file.isDeleted ? '刪除' : '修改';
        console.log(`   ├─ [${fileStatus}] ${file.filePath}`);
        try {
          // 使用 JSON.stringify 來正確處理包含空格或特殊字符的檔案路徑
          // git add 對於刪除的檔案也能正確處理
          execSync(`git add ${JSON.stringify(file.filePath)}`, { encoding: 'utf-8' });
          addedFiles.push(file.filePath);
        } catch (addError) {
          console.error(`   ⚠️  無法加入檔案: ${file.filePath}`, addError.message);
          throw addError;
        }
      }

      // 生成 commit message
      console.log(`   └─ 生成 commit message...`);
      const commitMessage = await generateCommitMessage(group, files, config);

      if (!commitMessage) {
        console.log(`   ❌ 無法生成 commit message，跳過此群組`);
        return false;
      }

      console.log(`\n   📝 Commit Message:`);
      console.log(`   ${'─'.repeat(50)}`);
      commitMessage.split('\n').forEach((line) => {
        console.log(`   ${line}`);
      });
      console.log(`   ${'─'.repeat(50)}`);

      // 執行 commit
      // 使用臨時檔案避免 commit message 中的特殊字符問題
      const { writeFileSync, unlinkSync } = await import('fs');
      const tmpFile = '.git/COMMIT_EDITMSG_TMP';
      try {
        writeFileSync(tmpFile, commitMessage, 'utf-8');
        execSync(`git commit -F ${tmpFile}`, {
          stdio: 'inherit',
        });
        unlinkSync(tmpFile);
      } catch (commitError) {
        try {
          unlinkSync(tmpFile);
        } catch (e) {
          // 忽略刪除臨時檔案的錯誤
        }
        throw commitError;
      }

      console.log(`   ✅ Commit 完成！`);
      return true;
    } catch (error) {
      // 如果失敗，unstage 所有已經 add 的檔案
      if (addedFiles.length > 0) {
        console.log(`   🔄 清理已 staged 的檔案...`);
        try {
          execSync('git reset HEAD -- .', { stdio: 'ignore' });
        } catch (e) {
          // 忽略 reset 錯誤
        }
      }
      throw error;
    }
  } catch (error) {
    console.error(`   ❌ Commit 失敗:`, error.message);
    return false;
  }
}

/**
 * 主函數
 */
async function autoCommitAll() {
  try {
    // 載入配置
    const config = await loadCommitConfig();

    console.log('🚀 智能分析所有變更並自動提交\n');

    if (config.output.verbose) {
      console.log('📋 使用配置：');
      console.log(`   AI Model: ${config.ai.model}`);
      console.log(`   Max Diff Length: ${config.ai.maxDiffLength}`);
      console.log(`   Max Retries: ${config.ai.maxRetries}`);
      console.log('');
    }

    // 1. 獲取所有變更
    console.log('📋 掃描變更中...');
    const changes = getAllChanges();

    if (changes.length === 0) {
      console.log('✨ 沒有需要提交的變更');
      process.exit(0);
    }

    console.log(`📊 找到 ${changes.length} 個變更的檔案:\n`);
    changes.forEach((change, index) => {
      let status = '修改';
      if (change.isNew) status = '新增';
      if (change.isDeleted) status = '刪除';
      console.log(`   [${index}] ${status} - ${change.filePath}`);
    });
    console.log();

    // 2. 使用 AI 分析並分組
    const groups = await analyzeAndGroupChanges(changes, config);

    if (!groups || groups.length === 0) {
      console.log('❌ AI 分析失敗或沒有產生分組');
      process.exit(1);
    }

    // 驗證所有檔案都被包含在分組中
    const groupedIndices = new Set();
    groups.forEach((group) => {
      group.file_indices.forEach((index) => {
        groupedIndices.add(index);
      });
    });

    const ungroupedIndices = [];
    for (let i = 0; i < changes.length; i++) {
      if (!groupedIndices.has(i)) {
        ungroupedIndices.push(i);
      }
    }

    // 如果有檔案未被分組，創建一個 "其他變更" 群組
    if (ungroupedIndices.length > 0) {
      console.log(`\n⚠️  發現 ${ungroupedIndices.length} 個未分組的檔案，將自動歸類：`);
      ungroupedIndices.forEach((index) => {
        console.log(`   - ${changes[index].filePath}`);
      });

      groups.push({
        group_name: '其他變更',
        commit_type: 'chore',
        commit_scope: 'misc',
        file_indices: ungroupedIndices,
        description: '未能自動分類的其他變更',
      });
    }

    console.log(`\n✅ AI 分析完成，共分為 ${groups.length} 個群組:\n`);
    groups.forEach((group, index) => {
      console.log(`   群組 ${index + 1}: ${group.group_name} (${group.commit_type})`);
      console.log(`   └─ 包含 ${group.file_indices.length} 個檔案`);
    });

    // 3. 依序提交每個群組
    console.log(`\n${'='.repeat(60)}`);
    console.log('開始執行提交...');
    console.log('='.repeat(60));

    let successCount = 0;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupFiles = group.file_indices.map((index) => changes[index]);

      // 驗證檔案索引是否有效
      const invalidIndices = group.file_indices.filter((idx) => idx >= changes.length);
      if (invalidIndices.length > 0) {
        console.error(`\n❌ 群組 ${i + 1} 包含無效的檔案索引:`, invalidIndices);
        console.log(`   跳過此群組: ${group.group_name}`);
        continue;
      }

      const success = await commitGroup(group, groupFiles, config);
      if (success) {
        successCount++;
      }
    }

    // 4. 顯示摘要
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ 完成！成功提交 ${successCount}/${groups.length} 個群組`);
    console.log('='.repeat(60));

    if (successCount < groups.length) {
      const failedCount = groups.length - successCount;
      console.log(`\n⚠️  有 ${failedCount} 個群組提交失敗`);
    }

    // 顯示最近的幾個 commits
    if (successCount > 0) {
      console.log('\n📋 最近的 commits:');
      execSync(`git log -${successCount} --oneline`, { stdio: 'inherit' });
    } else {
      console.log('\n⚠️  沒有成功的提交');
    }

    // Reset 任何剩餘的 staged 檔案
    try {
      execSync('git reset HEAD -- .', { stdio: 'ignore' });
    } catch (e) {
      // 忽略
    }
  } catch (error) {
    console.error('\n❌ 錯誤:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

autoCommitAll();
