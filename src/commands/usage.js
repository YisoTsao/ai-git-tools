/**
 * Usage 命令 - 查看組織 AI Copilot 使用狀態與用量
 *
 * 用法：
 *   npx ai-git-tools usage
 *   npx ai-git-tools usage --from 2026-06-01 --to 2026-06-30
 *   npx ai-git-tools usage --top 10 --sort credits
 *   npx ai-git-tools usage --export usage.csv
 *   npx ai-git-tools usage --breakdown
 *   npx ai-git-tools usage --org my-org
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { Logger } from '../utils/logger.js';
import { GitHubAPI } from '../pr-modules/core/github-api.js';

// 每個 AI Credit 的費用
const CREDIT_COST = 0.01;

// ANSI 色碼
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

const logger = new Logger();

// ─── 工具函式 ──────────────────────────────────────────────────────────────────

/**
 * 轉換日期為 YYYY-MM-DD 字串
 */
function toISODate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * 格式化日期顯示（如 Jun 1, 2026）
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * 格式化數字，加千位分隔符
 */
function fmtNum(n, decimals = 2) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── GitHub API 呼叫 ────────────────────────────────────────────────────────────

/**
 * 抓取組織 Copilot Billing Seats（所有席位擁有者）
 */
function fetchSeats(orgName) {
  try {
    const raw = execSync(
      `gh api "orgs/${orgName}/copilot/billing/seats" --paginate --jq '.seats // []'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    // paginate 模式下可能回傳多個 JSON 陣列，逐行合併
    const allSeats = [];
    for (const line of raw.split('\n').filter(Boolean)) {
      try {
        const parsed = JSON.parse(line);
        if (Array.isArray(parsed)) allSeats.push(...parsed);
      } catch {
        // 跳過格式異常的行
      }
    }
    return allSeats;
  } catch {
    return [];
  }
}

/**
 * 抓取 Copilot 每日使用指標（聚合）
 */
function fetchMetrics(orgName, since, until) {
  try {
    const raw = execSync(
      `gh api "orgs/${orgName}/copilot/metrics?since=${since}&until=${until}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 抓取特定團隊的成員（過濾用途）
 */
function fetchTeamMembers(orgName, teamSlug) {
  try {
    const raw = execSync(
      `gh api "orgs/${orgName}/teams/${teamSlug}/members" --paginate --jq '.[].login'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return raw.trim().split('\n').filter(Boolean);
  } catch {
    return null; // null 表示找不到團隊
  }
}

// ─── 資料處理 ────────────────────────────────────────────────────────────────────

/**
 * 從每日 metrics 彙整總量
 */
function aggregateMetrics(metrics) {
  let totalSuggestions = 0;
  let totalAcceptances = 0;
  let totalLines = 0;
  let totalAcceptedLines = 0;
  let totalIDEChats = 0;
  let totalDotcomChats = 0;
  let totalPRSummaries = 0;
  let peakActiveUsers = 0;

  for (const day of metrics) {
    peakActiveUsers = Math.max(peakActiveUsers, day.total_active_users || 0);

    // IDE 程式碼補全
    for (const model of day.copilot_ide_code_completions?.models ?? []) {
      for (const lang of model.languages ?? []) {
        totalSuggestions += lang.total_code_suggestions || 0;
        totalAcceptances += lang.total_code_acceptances || 0;
        totalLines += lang.total_code_lines_suggested || 0;
        totalAcceptedLines += lang.total_code_lines_accepted || 0;
      }
    }

    // IDE Chat
    for (const editor of day.copilot_ide_chat?.editors ?? []) {
      for (const model of editor.models ?? []) {
        totalIDEChats += model.total_chats || 0;
      }
    }

    // Dotcom Chat（github.com 上的 Copilot Chat）
    for (const model of day.copilot_dotcom_chat?.models ?? []) {
      totalDotcomChats += model.total_chats || 0;
    }

    // PR Summaries
    for (const repo of day.copilot_dotcom_pull_requests?.repositories ?? []) {
      for (const model of repo.models ?? []) {
        totalPRSummaries += model.total_pr_summaries_created || 0;
      }
    }
  }

  return {
    totalSuggestions,
    totalAcceptances,
    totalLines,
    totalAcceptedLines,
    totalIDEChats,
    totalDotcomChats,
    totalPRSummaries,
    peakActiveUsers,
    totalChats: totalIDEChats + totalDotcomChats,
  };
}

/**
 * 計算每位用戶的估計用量
 *
 * 說明：GitHub Copilot API 目前僅提供組織級別的聚合指標，
 * 不直接提供每人詳細費用。此處以「活躍用戶數」為基礎，
 * 將聚合用量平均分配，作為估計依據。
 *
 * Credits 估算規則（近似 GitHub 定價）：
 *   代碼建議（每次採納） = 0.5 credit
 *   IDE Chat（每則）    = 1.0 credit
 *   Dotcom Chat（每則） = 1.0 credit
 *   PR Summary（每份） = 5.0 credits
 */
function calculateUserUsage(seats, fromDate, toDate, agg) {
  const activeSeats = seats.filter(s => {
    if (!s.last_activity_at) return false;
    const t = new Date(s.last_activity_at);
    return t >= fromDate && t <= toDate;
  });

  const activeCount = activeSeats.length || 1;

  // 每位活躍用戶的估計用量
  const creditsPerUser =
    (agg.totalAcceptances * 0.5) / activeCount +
    (agg.totalIDEChats * 1.0) / activeCount +
    (agg.totalDotcomChats * 1.0) / activeCount +
    (agg.totalPRSummaries * 5.0) / activeCount;

  return seats.map(seat => {
    const lastAt = seat.last_activity_at ? new Date(seat.last_activity_at) : null;
    const isActive = !!lastAt && lastAt >= fromDate && lastAt <= toDate;
    const credits = isActive ? Math.round(creditsPerUser * 100) / 100 : 0;

    return {
      login: seat.assignee?.login ?? 'unknown',
      isActive,
      lastActivityAt: lastAt,
      lastActivityEditor: seat.last_activity_editor ?? '-',
      pendingCancellation: !!seat.pending_cancellation_date,
      includedCredits: credits,
      additionalCredits: 0,
      grossAmount: Math.round(credits * CREDIT_COST * 100) / 100,
      additionalUsage: 0,
    };
  });
}

// ─── 表格顯示 ────────────────────────────────────────────────────────────────────

/**
 * 繪製 Unicode 表格分隔線
 */
function separator(widths, pos = 'middle') {
  const s = {
    top:    ['┌', '┬', '┐', '─'],
    middle: ['├', '┼', '┤', '─'],
    bottom: ['└', '┴', '┘', '─'],
  }[pos];
  return s[0] + widths.map(w => s[3].repeat(w + 2)).join(s[1]) + s[2];
}

/**
 * 繪製一列資料
 */
function row(cells, widths, aligns) {
  const parts = cells.map((cell, i) => {
    const s = String(cell ?? '');
    const w = widths[i];
    return aligns[i] === 'right' ? ` ${s.padStart(w)} ` : ` ${s.padEnd(w)} `;
  });
  return `│${parts.join('│')}│`;
}

/**
 * 顯示用量總覽表格
 */
function displayUsageTable(users, options) {
  const showInactive = options.inactive ?? false;
  const top = options.top ? parseInt(options.top, 10) : undefined;
  const sortBy = options.sort ?? 'credits';

  let list = showInactive ? [...users] : users.filter(u => u.isActive);

  // 排序
  if (sortBy === 'credits' || sortBy === 'amount') {
    list.sort((a, b) => b.includedCredits - a.includedCredits);
  } else if (sortBy === 'name') {
    list.sort((a, b) => a.login.localeCompare(b.login));
  } else if (sortBy === 'activity') {
    list.sort((a, b) => (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0));
  }

  if (top) list = list.slice(0, top);

  if (list.length === 0) {
    logger.warning('此期間無活躍用戶資料');
    return;
  }

  const headers = ['User', 'Included credits', 'Additional credits', 'Gross amount', 'Additional usage'];
  const aligns  = ['left',  'right',            'right',             'right',        'right'];

  const rows = list.map(u => [
    u.pendingCancellation ? `${u.login} ⚠` : u.login,
    u.isActive ? fmtNum(u.includedCredits) : c.dim + '—' + c.reset,
    fmtNum(u.additionalCredits),
    `$${fmtNum(u.grossAmount)}`,
    `$${fmtNum(u.additionalUsage)}`,
  ]);

  // 計算欄寬（忽略 ANSI 逸出碼）
  const ANSI_PATTERN = '[\u001b\u009b][[\\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]';
  const stripAnsi = s => s.replace(new RegExp(ANSI_PATTERN, 'g'), '');
  const colWidths = headers.map((h) =>
    Math.max(h.length, ...rows.map(r => stripAnsi(String(r[headers.indexOf(h)])).length))
  );

  console.log(separator(colWidths, 'top'));
  console.log(row(headers.map((h) => c.bright + h + c.reset), colWidths, aligns));
  console.log(separator(colWidths, 'middle'));
  for (const r_ of rows) {
    console.log(row(r_, colWidths, aligns));
  }
  console.log(separator(colWidths, 'bottom'));
}

/**
 * 顯示每日使用量明細（--breakdown 選項）
 */
function displayDailyBreakdown(metrics) {
  if (!metrics.length) return;

  console.log(`\n${c.bright}📅  每日使用量明細${c.reset}\n`);

  const headers = ['Date', 'Active', 'Engaged', 'Suggestions', 'Acceptances', 'Accept %', 'IDE Chats', 'PR Summaries'];
  const aligns  = ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];

  const rows = metrics.map(day => {
    let sugg = 0, acc = 0, chats = 0, prs = 0;

    for (const m of day.copilot_ide_code_completions?.models ?? []) {
      for (const l of m.languages ?? []) {
        sugg += l.total_code_suggestions || 0;
        acc  += l.total_code_acceptances || 0;
      }
    }
    for (const e of day.copilot_ide_chat?.editors ?? []) {
      for (const m of e.models ?? []) chats += m.total_chats || 0;
    }
    for (const m of day.copilot_dotcom_chat?.models ?? []) chats += m.total_chats || 0;
    for (const repo of day.copilot_dotcom_pull_requests?.repositories ?? []) {
      for (const m of repo.models ?? []) prs += m.total_pr_summaries_created || 0;
    }

    const rate = sugg > 0 ? ((acc / sugg) * 100).toFixed(1) + '%' : '—';

    return [
      day.date,
      day.total_active_users ?? 0,
      day.total_engaged_users ?? 0,
      sugg.toLocaleString(),
      acc.toLocaleString(),
      rate,
      chats.toLocaleString(),
      prs.toLocaleString(),
    ];
  });

  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i]).length))
  );

  console.log(separator(colWidths, 'top'));
  console.log(row(headers.map(h => c.bright + h + c.reset), colWidths, aligns));
  console.log(separator(colWidths, 'middle'));
  for (const r_ of rows) console.log(row(r_, colWidths, aligns));
  console.log(separator(colWidths, 'bottom'));
}

/**
 * 顯示統計摘要
 */
function displaySummary(users, agg, fromDate, toDate) {
  const activeUsers = users.filter(u => u.isActive);
  const totalCredits = users.reduce((s, u) => s + u.includedCredits, 0);
  const acceptRate = agg.totalSuggestions > 0
    ? ((agg.totalAcceptances / agg.totalSuggestions) * 100).toFixed(1)
    : '0.0';

  console.log(`\n${c.bright}══════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bright}📊  摘要統計${c.reset}  （${toISODate(fromDate)} ～ ${toISODate(toDate)}）\n`);

  console.log(`  ${c.cyan}席位總數${c.reset}          ${users.length} 人`);
  console.log(`  ${c.green}活躍用戶${c.reset}          ${activeUsers.length} 人`);
  console.log(`  ${c.yellow}估計總用量${c.reset}        ${fmtNum(totalCredits)} credits`);
  console.log(`  ${c.yellow}估計總費用${c.reset}        $${fmtNum(totalCredits * CREDIT_COST)}`);

  if (agg.totalSuggestions > 0 || agg.totalChats > 0) {
    console.log('');
    console.log(`  ${c.bright}💡 Copilot 使用指標（組織合計）${c.reset}`);
    console.log(`  ├── 代碼建議數     ${agg.totalSuggestions.toLocaleString()}`);
    console.log(`  ├── 採納建議數     ${agg.totalAcceptances.toLocaleString()}  （採納率 ${acceptRate}%）`);
    console.log(`  ├── 建議行數       ${agg.totalLines.toLocaleString()}`);
    console.log(`  ├── 採納行數       ${agg.totalAcceptedLines.toLocaleString()}`);
    console.log(`  ├── IDE Chat 次數  ${agg.totalIDEChats.toLocaleString()}`);
    console.log(`  ├── Web Chat 次數  ${agg.totalDotcomChats.toLocaleString()}`);
    console.log(`  └── PR 摘要份數   ${agg.totalPRSummaries.toLocaleString()}`);
  }

  console.log(`\n  ${c.dim}⚠ 每用戶 Credits 為基於組織聚合指標的等比估算${c.reset}`);
  console.log(`  ${c.dim}  精確帳單數據請至 GitHub 組織後台 Settings → Billing 查看${c.reset}\n`);
}

/**
 * 匯出為 CSV
 */
function exportToCSV(users, filename) {
  const headers = ['User', 'Active', 'Included credits', 'Additional credits', 'Gross amount', 'Additional usage', 'Last activity', 'Last editor', 'Pending cancellation'];
  const rows = users.map(u => [
    u.login,
    u.isActive ? 'Yes' : 'No',
    u.includedCredits.toFixed(2),
    u.additionalCredits.toFixed(2),
    u.grossAmount.toFixed(2),
    u.additionalUsage.toFixed(2),
    u.lastActivityAt ? toISODate(u.lastActivityAt) : '',
    u.lastActivityEditor,
    u.pendingCancellation ? 'Yes' : 'No',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  writeFileSync(filename, csvContent, 'utf-8');
  logger.success(`已匯出至 ${filename}（共 ${users.length} 筆）`);
}

// ─── 主函式 ────────────────────────────────────────────────────────────────────

/**
 * Usage 命令主函式
 */
export async function usageCommand(options = {}) {
  const githubAPI = new GitHubAPI();
  const orgName = options.org || githubAPI.orgName;

  if (!orgName) {
    logger.error('無法偵測組織名稱');
    console.log(`請使用 ${c.cyan}--org <org-name>${c.reset} 指定組織，或在 Git repo 根目錄下執行`);
    process.exit(1);
  }

  // 驗證 gh CLI 登入
  const authStatus = githubAPI.checkAuth();
  if (!authStatus.authenticated) {
    logger.error('GitHub CLI 未登入或 token 已失效');
    console.log(`\n請先執行：${c.green}gh auth login${c.reset}`);
    console.log('登入時請確保選取 scope：');
    console.log('  · manage_billing:copilot（查看用量資訊）');
    console.log('  · read:org（查看成員列表）\n');
    process.exit(1);
  }

  // 計算日期範圍（預設：本月）
  const now = new Date();
  const fromDate = options.from ? new Date(options.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate   = options.to   ? new Date(options.to)   : now;
  const fromStr  = toISODate(fromDate);
  const toStr    = toISODate(toDate);

  // ── 標題 ──────────────────────────────────────────────────
  console.log('');
  console.log(`${c.bright}Usage breakdown${c.reset}`);
  console.log(`${c.dim}Usage for ${formatDate(fromDate)} - ${formatDate(toDate)}. Each AI credit costs $${CREDIT_COST.toFixed(2)}.${c.reset}`);
  console.log('');

  try {
    // 1. 抓取 Seats
    logger.step(`抓取 ${c.cyan}${orgName}${c.reset} 的 Copilot Seats...`);
    let seats = fetchSeats(orgName);

    if (seats.length === 0) {
      logger.warning('無法取得 Seats 資料（可能需要 manage_billing:copilot 權限）');
      logger.warning('嘗試改用組織成員列表...');
      const members = await githubAPI.fetchOrgMembers(orgName);
      // 將 members 轉換為 seats 結構（無 last_activity_at）
      seats = members.map(m => ({
        assignee: { login: m.login },
        last_activity_at: null,
        last_activity_editor: null,
        pending_cancellation_date: null,
      }));
    }

    // 2. 套用 Team 過濾（若指定 --team）
    if (options.team) {
      logger.step(`套用團隊過濾：${options.team}...`);
      const teamMembers = fetchTeamMembers(orgName, options.team);
      if (teamMembers === null) {
        logger.error(`找不到團隊 "${options.team}"`);
        process.exit(1);
      }
      const teamSet = new Set(teamMembers);
      seats = seats.filter(s => teamSet.has(s.assignee?.login));
      if (seats.length === 0) {
        logger.warning(`團隊 "${options.team}" 中無 Copilot Seat`);
        return;
      }
    }

    // 3. 抓取使用指標
    logger.step('抓取 Copilot 使用指標...');
    const metrics = fetchMetrics(orgName, fromStr, toStr);
    if (metrics.length === 0) {
      logger.warning('無法取得 Copilot Metrics 資料（可能需要 GitHub Copilot Enterprise 方案）');
    }

    // 4. 計算用量
    const agg = aggregateMetrics(metrics);
    const usageData = calculateUserUsage(seats, fromDate, toDate, agg);

    // 5. 顯示表格
    console.log('');
    displayUsageTable(usageData, options);

    // 6. 顯示摘要
    displaySummary(usageData, agg, fromDate, toDate);

    // 7. 每日明細（可選）
    if (options.breakdown) {
      displayDailyBreakdown(metrics);
    }

    // 8. JSON 輸出（可選）
    if (options.json) {
      const jsonOutput = {
        org: orgName,
        period: { from: fromStr, to: toStr },
        summary: {
          totalSeats: usageData.length,
          activeUsers: usageData.filter(u => u.isActive).length,
          totalCredits: usageData.reduce((s, u) => s + u.includedCredits, 0),
          ...agg,
        },
        users: usageData,
        dailyMetrics: metrics,
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
    }

    // 9. 匯出 CSV（可選）
    if (options.export) {
      exportToCSV(usageData, options.export);
    }

  } catch (error) {
    logger.error(`執行失敗：${error.message}`);
    console.log('\n排除問題：');
    console.log('  1. 確認已執行：gh auth login');
    console.log('  2. 確認 Token 包含 manage_billing:copilot 或 read:org scope');
    console.log(`  3. 確認有權限存取組織 ${orgName}`);
    console.log('  4. 確認組織已啟用 GitHub Copilot');
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}
