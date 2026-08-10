# model-info 命令實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `npx ai-git-tools model-info` 命令，顯示 GitHub Copilot SDK 可用模型資訊。

**Architecture:** 靜態模型資料表獨立於命令邏輯，命令負責過濾、格式化與輸出；透過既有 `registerCommand` 註冊到 CLI。

**Tech Stack:** Node.js ES modules、commander、chalk

## Global Constraints

- 資料來源：靜態資料表（`@github/copilot-sdk` 未公開模型列表 API）
- 不顯示價格/token 費用
- 不改變現有 `--model` 在其他命令中的行為
- 繁體中文（台灣正體）註解與輸出

---

### Task 1: 建立靜態模型資料表

**Files:**
- Create: `src/data/copilot-models.js`

**Interfaces:**
- Produces: `COPILOT_MODELS` 陣列，元素為 `{ id, name, description, contextWindow, recommendedFor, speed, notes }`

- [ ] **Step 1: 建立資料檔**

```javascript
/**
 * GitHub Copilot SDK 可用模型資訊表
 * 靜態維護，供 model-info 命令使用
 */

export const COPILOT_MODELS = [
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: '目前預設模型，綜合表現均衡，適合大多數任務',
    contextWindow: '128K',
    recommendedFor: ['commit', 'pr', 'analysis'],
    speed: 'medium',
    notes: '在極大 diff 的 PR 分析時可能較慢',
  },
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    description: '較新的模型，適合大型 PR 與複雜分析',
    contextWindow: '128K',
    recommendedFor: ['pr', 'analysis'],
    speed: 'medium',
    notes: '大 diff 分析建議使用此模型',
  },
];

export function getModelById(id) {
  return COPILOT_MODELS.find((m) => m.id === id);
}

export function filterModels(keyword) {
  if (!keyword) return COPILOT_MODELS;
  const lower = keyword.toLowerCase();
  return COPILOT_MODELS.filter(
    (m) =>
      m.id.toLowerCase().includes(lower) ||
      m.name.toLowerCase().includes(lower) ||
      m.description.toLowerCase().includes(lower)
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/copilot-models.js
git commit -m "feat: 新增 Copilot 模型資料表"
```

---

### Task 2: 實作 model-info 命令

**Files:**
- Create: `src/commands/model-info.js`
- Modify: `src/utils/constants.js`（若需要新增顏色輔助，可選）

**Interfaces:**
- Consumes: `getModelById`, `filterModels`, `COPILOT_MODELS` from `src/data/copilot-models.js`
- Consumes: `Logger` from `src/utils/logger.js`
- Produces: `modelInfoCommand(options)` async function

- [ ] **Step 1: 建立命令檔案**

```javascript
/**
 * model-info 命令
 * 顯示 GitHub Copilot SDK 可用模型資訊
 */

import { Logger } from '../utils/logger.js';
import {
  COPILOT_MODELS,
  getModelById,
  filterModels,
} from '../data/copilot-models.js';

const logger = new Logger();

/**
 * 格式化建議用途陣列為可讀字串
 */
function formatRecommendedFor(items) {
  if (!items || items.length === 0) return '—';
  return items.join('、');
}

/**
 * 印出單一模型詳細資訊
 */
function printModel(model) {
  console.log(`\n ${logger.colors?.cyan ?? ''}${model.id}${logger.colors?.reset ?? ''}`);
  console.log(' ─────────────────────────────────────────────────────────────');
  console.log(` 名稱：        ${model.name}`);
  console.log(` 描述：        ${model.description}`);
  console.log(` 上下文：      ${model.contextWindow}`);
  console.log(` 建議用途：    ${formatRecommendedFor(model.recommendedFor)}`);
  console.log(` 速度：        ${model.speed}`);
  if (model.notes) {
    console.log(` 備註：        ${model.notes}`);
  }
}

/**
 * 印出模型列表（精簡版）
 */
function printModelList(models) {
  console.log();
  for (const model of models) {
    console.log(`  ${(logger.colors?.cyan ?? '')}${model.id.padEnd(12)}${logger.colors?.reset ?? ''} ${model.description}`);
  }
}

export async function modelInfoCommand(options) {
  const { json, filter, model: modelId } = options;

  if (json) {
    let output = COPILOT_MODELS;
    if (filter) output = filterModels(filter);
    if (modelId) {
      const model = getModelById(modelId);
      output = model ? [model] : [];
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  logger.section('🤖 Copilot 可用模型');

  if (modelId) {
    const model = getModelById(modelId);
    if (!model) {
      logger.error(`找不到模型「${modelId}」`);
      logger.info(`可用模型：${COPILOT_MODELS.map((m) => m.id).join('、')}`);
      process.exit(1);
    }
    printModel(model);
    console.log();
    return;
  }

  const models = filterModels(filter);
  if (models.length === 0) {
    logger.warning('沒有符合條件的模型');
    return;
  }

  if (filter) {
    printModelList(models);
  } else {
    for (const model of models) {
      printModel(model);
    }
  }

  console.log();
  logger.info(`共 ${models.length} 個模型，使用 --model <id> 查看詳細資訊`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/model-info.js
git commit -m "feat: 新增 model-info 命令實作"
```

---

### Task 3: 註冊命令到 CLI

**Files:**
- Modify: `bin/cli.js`

**Interfaces:**
- Consumes: `modelInfoCommand` from `src/commands/model-info.js`

- [ ] **Step 1: 新增 import**

在 `bin/cli.js` 頂端加入：

```javascript
import { modelInfoCommand } from '../src/commands/model-info.js';
```

- [ ] **Step 2: 新增命令註冊**

在 usage 命令註冊之後、`program.parse()` 之前加入：

```javascript
// Model Info 命令
registerCommand(program, 'model-info', '查看目前可用的 AI 模型資訊', [
  { flags: '--json', description: '以 JSON 格式輸出完整模型資料' },
  { flags: '--filter <keyword>', description: '依模型名稱或描述關鍵字過濾' },
  { flags: '--model <model>', description: '查詢單一模型的詳細資訊' },
], modelInfoCommand);
```

- [ ] **Step 3: Commit**

```bash
git add bin/cli.js
git commit -m "feat: 註冊 model-info 命令到 CLI"
```

---

### Task 4: 手動測試與驗證

**Files:**
- 無

- [ ] **Step 1: 測試基本輸出**

```bash
node bin/cli.js model-info
```

預期：顯示模型列表與詳細資訊。

- [ ] **Step 2: 測試 JSON 輸出**

```bash
node bin/cli.js model-info --json
```

預期：輸出 JSON 陣列。

- [ ] **Step 3: 測試單一模型查詢**

```bash
node bin/cli.js model-info --model gpt-4.1
```

預期：只顯示 gpt-4.1 詳細資訊。

- [ ] **Step 4: 測試過濾**

```bash
node bin/cli.js model-info --filter gpt
```

預期：列出匹配的模型。

- [ ] **Step 5: 執行 lint**

```bash
npm run lint
```

預期：無錯誤。

---

## Spec Coverage

| 規格需求 | 對應任務 |
|---|---|
| 命令名稱 `model-info` | Task 3 |
| 支援 `--json` | Task 2 |
| 支援 `--filter` | Task 1 + Task 2 |
| 支援 `--model` | Task 1 + Task 2 |
| 輸出欄位 id/name/description/contextWindow/recommendedFor/speed/notes | Task 1 + Task 2 |
| 靜態資料表 | Task 1 |
| 不顯示價格 | 設計決策，無任務 |
| 繁體中文輸出 | Task 1 + Task 2 |

## Placeholder Scan

- 無 TBD/TODO
- 所有步驟附完整程式碼
- 所有命令與預期輸出具體明確
