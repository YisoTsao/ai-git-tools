import { CopilotClient } from '@github/copilot-sdk';
import { execSync } from 'child_process';
import { loadCommitConfig } from './commit-modules/config-loader.mjs';

/**
 * 清理 AI 回應，移除 markdown 程式碼區塊標記
 */
function cleanCommitMessage(message) {
  if (!message) return '';

  let cleaned = message.trim();

  // 移除 markdown 程式碼區塊標記
  cleaned = cleaned.replace(/^```[\w]*\n/gm, '');
  cleaned = cleaned.replace(/\n```$/gm, '');
  cleaned = cleaned.replace(/^```$/gm, '');

  // 移除開頭和結尾的引號
  cleaned = cleaned.replace(/^["']|["']$/g, '');

  return cleaned.trim();
}

/**
 * 驗證 commit message 是否有效
 */
function validateCommitMessage(message) {
  if (!message || message.length === 0) {
    return { valid: false, reason: 'Commit message 為空' };
  }

  if (message.length < 5) {
    return { valid: false, reason: 'Commit message 太短（少於 5 個字元）' };
  }

  // 檢查是否只包含特殊字元或空白
  if (!/[a-zA-Z0-9\u4e00-\u9fa5]/.test(message)) {
    return { valid: false, reason: 'Commit message 不包含有效字元' };
  }

  return { valid: true };
}

/**
 * 自動生成 commit message 並執行 commit
 * 用法：node scripts/ai-auto-commit.mjs [選項]
 *
 * 選項：
 *   --model <model>     指定 AI 模型 (預設: 從配置檔讀取或 gpt-4.1)
 *   --verbose, -v       顯示詳細輸出
 *   --help, -h          顯示幫助訊息
 */
async function autoCommit() {
  try {
    // 載入配置
    const config = await loadCommitConfig();

    if (config.output.verbose) {
      console.log('📋 使用配置：');
      console.log(`   AI Model: ${config.ai.model}`);
      console.log(`   Max Diff Length: ${config.ai.maxDiffLength}`);
    }

    // 檢查是否有 staged 變更
    const diff = execSync('git diff --staged').toString();

    if (!diff.trim()) {
      console.log('❌ 沒有 staged 的變更');
      console.log('💡 請先使用 git add 來 stage 你的變更');
      process.exit(1);
    }

    console.log('📝 正在分析變更內容...\n');

    // 截斷過長的 diff
    const truncatedDiff =
      diff.length > config.ai.maxDiffLength
        ? diff.substring(0, config.ai.maxDiffLength) + '\n\n... [diff 過長已截斷]'
        : diff;

    if (config.output.verbose && diff.length > config.ai.maxDiffLength) {
      console.log(`⚠️  Diff 已從 ${diff.length} 字元截斷至 ${config.ai.maxDiffLength} 字元\n`);
    }

    // 使用 Copilot SDK 生成 commit message（帶重試機制）
    const client = new CopilotClient();
    let commitMessage = '';
    let lastError = null;

    for (let attempt = 1; attempt <= config.ai.maxRetries; attempt++) {
      try {
        if (config.output.verbose && attempt > 1) {
          console.log(`🔄 重試第 ${attempt}/${config.ai.maxRetries} 次...\n`);
        }

        const session = await client.createSession({
          model: config.ai.model,
        });

        const response = await session.sendAndWait({
          prompt: `你是一個資深前端工程師，熟悉 Next.js 專案的開發規範。請根據以下 git diff 產生一則 commit message。

**專案背景**：
- Next.js 12+ (Pages Router)
- TypeScript + JavaScript 混合
- Tailwind CSS + Styled Components
- Zustand (客戶端狀態) + SWR (伺服器資料獲取)
- React Hook Form + Zod (表單處理)

**Commit Message 規則**：
1. 使用 Conventional Commits 格式：type(scope): subject
2. type 必須是：feat/fix/docs/style/refactor/test/chore/perf 其中之一
3. scope: 影響範圍（如 member、report、auth、api、ui、config）
4. subject 限制在 50 字內，使用繁體中文
5. 如果變更複雜，加上 body 說明（使用 bullet points）

**重要**：
- 直接輸出 commit message 純文字，不要使用 markdown 程式碼區塊（\`\`\`）
- 不要加上任何前綴說明或後綴文字
- 第一行是標題，如有需要可加上空行後的詳細說明

**範例格式**：
feat(member): 新增會員管理頁面

- 實作會員列表查詢功能
- 新增會員資料編輯表單
- 整合 Zustand 狀態管理

git diff:
${truncatedDiff}`,
        });

        const rawMessage = response?.data.content || '';
        commitMessage = cleanCommitMessage(rawMessage);

        // 驗證 commit message
        const validation = validateCommitMessage(commitMessage);
        if (!validation.valid) {
          throw new Error(`無效的 commit message: ${validation.reason}`);
        }

        // 成功生成，跳出重試迴圈
        break;
      } catch (error) {
        lastError = error;
        if (config.output.verbose) {
          console.log(`⚠️  嘗試 ${attempt} 失敗: ${error.message}\n`);
        }

        // 如果還有重試機會，繼續
        if (attempt < config.ai.maxRetries) {
          continue;
        }
      }
    }

    await client.stop();

    // 所有重試都失敗
    if (!commitMessage) {
      console.log('❌ 無法生成有效的 commit message');
      if (lastError && config.output.verbose) {
        console.log(`   最後錯誤: ${lastError.message}`);
      }
      console.log('\n💡 建議：');
      console.log('   1. 檢查網路連線');
      console.log('   2. 嘗試更換 AI 模型（使用 --model 參數）');
      console.log('   3. 確認變更內容不會太複雜或太大');
      process.exit(1);
    }

    console.log('✅ 生成的 Commit Message:');
    console.log('─'.repeat(50));
    console.log(commitMessage);
    console.log('─'.repeat(50));

    // 執行 commit
    console.log('\n🚀 正在執行 commit...');
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
    });

    console.log('\n✅ Commit 完成！');
  } catch (error) {
    console.error('\n❌ 錯誤:', error.message);
    process.exit(1);
  }
}

autoCommit();
