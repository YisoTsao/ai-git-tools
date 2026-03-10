import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { GitOperations } from './git-operations.js';
import { GitHubAPI } from './github-api.js';
import { AIAnalyzer } from '../ai/code-analyzer.js';
import { LabelAnalyzer } from '../ai/label-analyzer.js';
import { ReviewerSelector } from '../reviewers/reviewer-selector.js';
import { Logger } from '../ui/logger.js';
import { PRError, log } from '../utils/helpers.js';
import { CONSTANTS, colors } from '../utils/constants.js';

/**
 * PR 工作流程編排
 */
export class PRWorkflow {
  constructor(config) {
    this.config = config;
    this.git = new GitOperations();
    this.github = new GitHubAPI(); // 自動從 git remote 偵測組織名稱
    this.ai = new AIAnalyzer({ model: config.ai.model });
    this.labelAnalyzer = new LabelAnalyzer();
    this.reviewerSelector = new ReviewerSelector({
      interactiveReviewers: config.reviewers.interactiveReviewers,
      maxSuggested: config.reviewers.maxSuggested,
      gitHistoryDepth: config.reviewers.gitHistoryDepth,
      excludeAuthors: config.reviewers.excludeAuthors,
    });
    this.logger = new Logger();
  }

  /**
   * 執行完整工作流程
   */
  async execute() {
    // 0. 確認 gh CLI 已登入（預覽模式可跳過）
    if (!this.config.preview) {
      const auth = this.github.checkAuth();
      if (!auth.authenticated) {
        log.error('GitHub CLI 未登入，請先執行: gh auth login');
        throw new Error('GitHub CLI 未登入');
      }
    }

    // 1. 驗證環境和分支
    const { baseBranch, headBranch } = await this.detectAndValidateBranches();

    // 2. 檢查是否有變更
    await this.validateChanges(baseBranch, headBranch);

    // 3. 推送到遠端（預覽模式跳過）
    if (!this.config.preview) {
      await this.pushToRemote(headBranch);
    }

    // 4. 收集變更資訊
    const changeData = this.collectChangeData(baseBranch, headBranch);

    // 5. AI 分析和生成 PR 內容
    const prContent = await this.generatePRContent(changeData);

    // 6. 顯示預覽
    this.displayPreview(prContent, changeData.stats);

    // 預覽模式：僅顯示不創建
    if (this.config.preview) {
      log.info('預覽模式：未創建 PR');
      return;
    }

    // 7. 選擇 Reviewers
    const reviewers = await this.selectReviewers(changeData);

    // 8. 確認創建
    if (!this.config.noConfirm) {
      const confirmed = await this.askConfirmation('是否創建此 Pull Request?');
      if (!confirmed) {
        log.info('已取消創建 PR');
        return;
      }
    }

    // 9. 創建 PR
    const prUrl = await this.createPR(prContent, baseBranch, headBranch, reviewers);

    // 10. 添加 Labels（如果啟用）
    if (this.config.github.autoLabels === true && prUrl) {
      try {
        const prNumber = prUrl.split('/').pop();
        await this.addLabels(prNumber, {
          ...prContent,
          stats: changeData.stats,
        });
      } catch (error) {
        log.warning('無法自動添加 Labels: ' + error.message);
      }
    }

    this.logger.success('完成！');
  }

  /**
   * 偵測和驗證分支
   */
  async detectAndValidateBranches() {
    // 獲取當前分支
    const currentBranch = this.git.getCurrentBranch();
    let headBranch = this.config.headBranch || currentBranch;
    let baseBranch = this.config.baseBranch;

    // 自動偵測 base branch
    if (!baseBranch) {
      // 優先使用配置檔中的 defaultBase
      if (this.config.github?.defaultBase) {
        const defaultBase = this.config.github.defaultBase;
        
        // 如果 defaultBase 是 'release'，則自動查找最新的 release 分支
        if (defaultBase === 'release' || defaultBase.match(/^release$/i)) {
          log.step('配置檔指定使用 release 分支，正在偵測最新版本...\n');
          const allBranches = this.git.detectReleaseBranches();
          const latestRelease = this.git.findLatestReleaseBranch();

          if (latestRelease) {
            baseBranch = latestRelease;
            this.displayDetectedBranches(allBranches, latestRelease);
            log.success(`自動選擇最新 release 分支: ${baseBranch}`);
            log.info(`提示: 使用 --base <分支名> 指定其他分支\n`);
          } else {
            throw new PRError('未偵測到任何 release 分支', 'NO_RELEASE_BRANCH', [
              '使用 --base 參數指定目標分支',
              '或在 .ai-git-config.js 中設置具體的分支名（如 release-2025-m12.1）',
              '確認遠端分支存在: git branch -r | grep release',
            ]);
          }
        } else {
          // 使用配置檔中指定的具體分支名
          baseBranch = defaultBase;
          log.success(`使用配置檔指定的分支: ${baseBranch}\n`);
        }
      } else {
        // 如果沒有配置，則自動偵測最新的 release 分支
        log.step('正在偵測 release 分支...\n');
        const allBranches = this.git.detectReleaseBranches();
        const latestRelease = this.git.findLatestReleaseBranch();

        if (latestRelease) {
          baseBranch = latestRelease;
          this.displayDetectedBranches(allBranches, latestRelease);
          log.success(`自動選擇最新分支: ${baseBranch}`);
          log.info(`提示: 使用 --base <分支名> 指定其他分支\n`);
        } else {
          throw new PRError('未偵測到任何 release 分支', 'NO_RELEASE_BRANCH', [
            '使用 --base 參數指定目標分支',
            '或在 .ai-git-config.js 中設置 github.defaultBase',
            '確認遠端分支存在: git branch -r | grep release',
          ]);
        }
      }
    }

    // 檢查是否在 base branch
    if (currentBranch === baseBranch) {
      throw new PRError(`你目前在 ${baseBranch} 分支，請切換到 feature 分支`, 'ON_BASE_BRANCH', [
        '切換到 feature 分支: git checkout <feature-branch>',
      ]);
    }

    console.log(`📊 準備創建 PR: ${headBranch} → ${baseBranch}\n`);

    return { baseBranch, headBranch };
  }

  /**
   * 顯示偵測到的分支
   */
  displayDetectedBranches(allBranches, latestRelease) {
    const monthlyBranches = allBranches.filter((b) => b.includes('-m'));
    const weeklyBranches = allBranches.filter((b) => b.includes('-w'));

    console.log('📋 偵測到的 release 分支:\n');

    if (monthlyBranches.length > 0) {
      console.log('  月度分支 (優先):');
      monthlyBranches.slice(0, 3).forEach((branch, index) => {
        const marker = branch === latestRelease ? ' ← 最新' : '';
        console.log(`    ${index + 1}. ${branch}${marker}`);
      });
      if (monthlyBranches.length > 3) {
        console.log(`    ... 還有 ${monthlyBranches.length - 3} 個月度分支`);
      }
    }

    if (weeklyBranches.length > 0) {
      console.log('\n  週度分支:');
      weeklyBranches.slice(0, 3).forEach((branch, index) => {
        const marker = branch === latestRelease ? ' ← 最新' : '';
        console.log(`    ${index + 1}. ${branch}${marker}`);
      });
      if (weeklyBranches.length > 3) {
        console.log(`    ... 還有 ${weeklyBranches.length - 3} 個週度分支`);
      }
    }

    console.log('');
  }

  /**
   * 驗證變更
   */
  async validateChanges(baseBranch, headBranch) {
    // 先同步遠端資訊
    log.step('正在同步遠端資訊...');
    await this.git.fetch();
    log.success('同步完成\n');

    // 顯示分支狀態診斷信息
    if (this.config.output?.verbose) {
      console.log(`${colors.cyan}🔍 分支診斷信息:${colors.reset}`);
      try {
        const currentBranch = this.git.getCurrentBranch();
        console.log(`  當前分支: ${currentBranch}`);
        console.log(`  Base 分支: origin/${baseBranch}`);
        console.log(`  Head 分支: ${headBranch} (本地)`);
        
        // 檢查遠端分支是否存在
        try {
          execSync(`git rev-parse --verify origin/${headBranch}`, { stdio: 'pipe' });
          console.log(`  遠端 ${headBranch}: ✓ 存在`);
        } catch (e) {
          console.log(`  遠端 ${headBranch}: ✗ 不存在（尚未推送）`);
        }
      } catch (e) {
        // 忽略診斷錯誤
      }
      console.log('');
    }

    // 檢查本地 commit 差異（使用本地 headBranch）
    let localCommits;
    try {
      localCommits = this.git.getCommits(baseBranch, headBranch, {
        oneline: true,
        noDecorate: true,
        useRemoteHead: false, // 使用本地分支以檢測未推送的commit
      });
    } catch (error) {
      throw new PRError(
        `無法比較分支差異，請確認 origin/${baseBranch} 分支存在`,
        'BRANCH_COMPARE_FAILED',
        ['同步遠端: git fetch origin', `檢查分支: git branch -r | grep ${baseBranch}`]
      );
    }

    if (!localCommits.trim()) {
      throw new PRError(`${headBranch} 和 origin/${baseBranch} 之間沒有新的 commit`, 'NO_COMMITS', [
        '檢查當前分支: git branch',
        `查看分支歷史: git log origin/${baseBranch}..${headBranch}`,
        '確認是否有未提交的變更: git status',
      ]);
    }

    // 顯示 commit 預覽
    console.log(`${colors.cyan}📝 本地 commit 預覽（相對於 origin/${baseBranch}）:${colors.reset}`);
    const commitLines = localCommits.split('\n');
    console.log(
      commitLines
        .slice(0, CONSTANTS.MAX_COMMIT_PREVIEW)
        .map((line) => `  ${line}`)
        .join('\n')
    );
    if (commitLines.length > CONSTANTS.MAX_COMMIT_PREVIEW) {
      console.log(`  ... 還有 ${commitLines.length - CONSTANTS.MAX_COMMIT_PREVIEW} 個 commit`);
    }
    console.log('');
  }

  /**
   * 推送到遠端
   */
  async pushToRemote(headBranch) {
    log.step(`推送到遠端分支: origin/${headBranch}`);
    await this.git.push(headBranch);
    log.success('推送成功\n');

    // 等待 GitHub 同步
    log.info('等待 GitHub 同步...');
    await new Promise((resolve) => setTimeout(resolve, CONSTANTS.GITHUB_SYNC_DELAY));

    // 重新同步
    await this.git.fetch();
    log.success('同步完成\n');
  }

  /**
   * 收集變更資料
   */
  collectChangeData(baseBranch, headBranch) {
    // 此時已經推送完成，使用本地分支即可（本地和遠端應該已同步）
    const stats = this.git.getChangeStats(baseBranch, headBranch, false);
    const changedFiles = this.git.getChangedFiles(baseBranch, headBranch, false);
    const commits = this.git.getCommits(baseBranch, headBranch, { useRemoteHead: false });
    const diff = this.git.getDiff(baseBranch, headBranch, false);
    const truncatedDiff = this.git.truncateDiff(diff);

    console.log(`📈 變更統計: ${stats.stats}`);
    console.log(`📁 影響檔案: ${stats.filesChanged} 個\n`);

    if (truncatedDiff.length < diff.length) {
      log.info(`變更內容較大，已智能截斷 (${diff.length} → ${truncatedDiff.length} 字元)\n`);
    }

    return { stats, changedFiles, commits, diff: truncatedDiff };
  }

  /**
   * 生成 PR 內容
   */
  async generatePRContent(changeData) {
    log.step(`正在使用 AI 生成 PR 內容 (${this.config.ai.model})...\n`);

    // 生成 PR 標題和描述
    const { title, body } = await this.ai.generatePRContent(changeData.commits, changeData.diff);

    let enhancedBody = body;
    let blastRadius = null;
    let warnings = [];

    // 根據配置決定是否進行影響範圍分析
    if (this.config.github.includeImpactAnalysis === true) {
      log.step('正在使用 AI 深度分析影響範圍和潛在問題...\n');
      const analysis = await this.ai.analyzeImpact(
        changeData.changedFiles,
        changeData.diff,
        changeData.commits
      );
      blastRadius = analysis.blastRadius;
      warnings = analysis.warnings;

      // 顯示分析結果摘要
      this.displayAnalysisSummary(blastRadius, warnings);

      // 將分析結果附加到 body
      enhancedBody = this.ai.appendAnalysisToBody(body, blastRadius, warnings);
    }

    return { title, body: enhancedBody, blastRadius, warnings };
  }

  /**
   * 顯示分析結果摘要
   */
  displayAnalysisSummary(blastRadius, warnings) {
    console.log(`${colors.cyan}📊 AI 分析結果:${colors.reset}`);
    if (blastRadius.modules.length > 0) {
      console.log(`  • 影響模組: ${blastRadius.modules.join('、')}`);
    }
    if (blastRadius.impacts.length > 0) {
      console.log(`  • 影響層面: ${blastRadius.impacts.join('、')}`);
    }
    const riskEmojiMap = { 高: '🔴', 中: '🟡', 低: '🟢' };
    const riskEmoji = riskEmojiMap[blastRadius.riskLevel] || '🟢';
    console.log(`  • 風險等級: ${riskEmoji} ${blastRadius.riskLevel}`);
    if (warnings.length > 0) {
      console.log(`  • 發現 ${warnings.length} 個注意事項`);
    }
    console.log('');
  }

  /**
   * 顯示 PR 預覽
   */
  displayPreview(prContent, stats) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`${colors.bright}📋 PR 預覽${colors.reset}`);
    console.log('═'.repeat(80));
    console.log(`\n${colors.cyan}標題:${colors.reset} ${prContent.title}\n`);
    console.log(`${colors.cyan}統計:${colors.reset} ${stats.stats}`);
    console.log(`${colors.cyan}檔案數:${colors.reset} ${stats.filesChanged} 個檔案\n`);
    console.log('─'.repeat(80));
    console.log(`${colors.cyan}描述:${colors.reset}\n`);
    console.log(prContent.body);
    console.log(`\n${'═'.repeat(80)}\n`);
  }

  /**
   * 選擇 Reviewers
   */
  async selectReviewers(changeData) {
    if (this.config.noConfirm) {
      return null;
    }

    // 如果禁用互動式選擇，不添加任何 reviewers
    if (!this.config.reviewers.interactiveReviewers) {
      console.log('ℹ️  已禁用 reviewer 選擇（interactiveReviewers: false）\n');
      log.info('提示: 你可以在創建 PR 後手動添加 reviewers\n');
      return null;
    }

    // 獲取當前用戶
    const currentUser = this.git.getCurrentUser();

    // 根據 Git History 建議 Reviewers
    const suggestedReviewers = this.reviewerSelector.getReviewersByGitHistory(
      changeData.changedFiles
    );

    // 抓取 GitHub 團隊資訊（只在互動模式需要）
    const teams = await this.github.fetchTeams();

    // 選擇 Reviewers（互動模式）
    return await this.reviewerSelector.select(teams, suggestedReviewers, currentUser);
  }

  /**
   * 創建 PR
   */
  async createPR(prContent, baseBranch, headBranch, reviewers) {
    return await this.github.createOrUpdatePR({
      title: prContent.title,
      body: prContent.body,
      baseBranch,
      headBranch,
      reviewers,
      config: this.config,
      forceNew: this.config.forceNew,
    });
  }

  /**
   * 添加 Labels
   */
  async addLabels(prNumber, prData) {
    log.step('正在分析並添加 Labels...');
    const labels = await this.labelAnalyzer.analyzeAndApply(prNumber, prData);
    if (labels.length > 0) {
      console.log(`📌 已添加 Labels: ${labels.join(', ')}\n`);
    } else {
      log.info('未找到適合的 Labels');
    }
  }

  /**
   * 互動式確認
   */
  askConfirmation(question) {
    return new Promise((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(`${question} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}
