# model-info 命令設計規格

## 目標

新增一個 `npx ai-git-tools model-info` 命令，讓使用者查詢目前 GitHub Copilot SDK 建議/支援的 AI 模型清單，方便在 `--model` 參數中選擇正確的模型 ID。

## 背景

目前 `ai-git-tools` 的 AI 呼叫全部透過 `@github/copilot-sdk`，預設模型為 `gpt-4.1`。使用者在 `commit`、`commit-all`、`pr` 等命令中可以使用 `--model <model>` 指定模型，但沒有任何內建方式知道哪些模型可用或適合什麼場景。

## 設計

### 命令名稱

- `npx ai-git-tools model-info`

### 支援選項

| 選項 | 說明 |
|------|------|
| `--json` | 以 JSON 格式輸出完整模型資料 |
| `--filter <keyword>` | 依模型名稱或描述關鍵字過濾 |
| `--model <model>` | 查詢單一模型的詳細資訊 |

### 輸出欄位

每個模型顯示以下資訊：

- `id`：模型 ID，可直接用於 `--model`（例如 `gpt-4.1`）
- `name`：可讀名稱
- `description`：簡短說明
- `contextWindow`：上下文長度（例如 `128K`）
- `recommendedFor`：建議用途陣列（`commit`、`pr`、`fast`、`analysis`）
- `speed`：回應速度分級（`fast`、`medium`、`slow`）
- `notes`：補充說明

### 資料來源

採用靜態資料表，存放於 `src/data/copilot-models.js`。理由：

- `@github/copilot-sdk` 未公開提供「列出所有模型」的 API
- 靜態表簡單、穩定、可立即使用
- 未來可擴充為動態抓取，不影響命令介面

### 架構

新增檔案：

- `src/data/copilot-models.js`：模型資料陣列
- `src/commands/model-info.js`：命令實作與輸出格式化

修改檔案：

- `bin/cli.js`：使用 `registerCommand` 註冊 `model-info` 命令

### 不納入範圍

- 不抓取即時動態模型清單
- 不顯示價格 / token 費用（暫不納入，未來可擴充）
- 不改變現有 `--model` 參數在其他命令中的行為

## 範例輸出

```bash
$ npx ai-git-tools model-info

╒══════════════════════════════════════════════════════════════╕
│                    🤖 Copilot 可用模型                        │
╘══════════════════════════════════════════════════════════════╛

 gpt-4.1
 ─────────────────────────────────────────────────────────────
 名稱：        GPT-4.1
 描述：        目前預設模型，綜合表現均衡，適合大多數任務
 上下文：      128K
 建議用途：    commit、pr、analysis
 速度：        medium
 備註：        在極大 diff 的 PR 分析時可能較慢

 gpt-5.4
 ─────────────────────────────────────────────────────────────
 名稱：        GPT-5.4
 描述：        較新的模型，適合大型 PR 與複雜分析
 上下文：      128K
 建議用途：    pr、analysis
 速度：        medium
 備註：        大 diff 分析建議使用此模型
```

## 相依性

- `commander`：命令註冊
- `chalk`：已為既有依賴，用於輸出上色
- `src/utils/cli-helpers.js`：使用 `registerCommand` 統一註冊
- `src/utils/logger.js`：使用既有 Logger 工具
