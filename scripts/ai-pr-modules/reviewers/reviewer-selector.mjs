import { execSync } from 'child_process';
import { CONSTANTS, colors } from '../utils/constants.mjs';
import { log } from '../utils/helpers.mjs';
import { InteractiveSelect } from '../ui/interactive-select.mjs';

/**
 * Reviewer 選擇器
 */
export class ReviewerSelector {
  constructor(config = {}) {
    this.interactiveReviewers = config.interactiveReviewers !== undefined ? config.interactiveReviewers : true;
    this.maxSuggested = config.maxSuggested || 5;
    this.gitHistoryDepth = config.gitHistoryDepth || 20;
    this.excludeAuthors = config.excludeAuthors || [];
  }

  /**
   * 根據 Git History 找出最常修改這些檔案的人
   */
  getReviewersByGitHistory(changedFiles, limit = null) {
    const contributors = {};
    const actualLimit = limit || this.maxSuggested;

    changedFiles.forEach((file) => {
      try {
        const logOutput = execSync(
          `git log -${this.gitHistoryDepth} --format="%ae|%an" -- "${file}"`,
          {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        );

        logOutput
          .split('\n')
          .filter(Boolean)
          .forEach((line) => {
            const [email, name] = line.split('|');
            if (email && email.includes('@')) {
              // 檢查是否在排除列表中
              const shouldExclude = this.excludeAuthors.some((excluded) => {
                const normalizedExcluded = excluded.toLowerCase();
                return (
                  email.toLowerCase().includes(normalizedExcluded) ||
                  (name && name.toLowerCase().includes(normalizedExcluded))
                );
              });

              if (!shouldExclude) {
                const key = email.toLowerCase();
                contributors[key] = {
                  email,
                  name: name || email.split('@')[0],
                  commits: (contributors[key]?.commits || 0) + 1,
                };
              }
            }
          });
      } catch (error) {
        // 忽略單個檔案的錯誤
      }
    });

    // 排序並取前 N 名
    return Object.values(contributors)
      .sort((a, b) => b.commits - a.commits)
      .slice(0, actualLimit);
  }

  /**
   * 互動式選擇 Reviewers
   */
  async selectInteractive(teamsData, suggestedReviewers, currentUser) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`${colors.bright}🎯 選擇 Reviewers${colors.reset}`);
    console.log(`${'═'.repeat(80)}\n`);

    // 解構 teams 和 members
    const teams = teamsData.teams || {};
    const orgMembers = teamsData.members || [];

    // 顯示建議的 Reviewers（基於 Git History）
    if (suggestedReviewers && suggestedReviewers.length > 0) {
      console.log(`${colors.cyan}💡 建議 Reviewers（基於 Git 歷史）:${colors.reset}`);
      suggestedReviewers.forEach((reviewer, idx) => {
        if (currentUser && reviewer.email.toLowerCase() === currentUser.email.toLowerCase()) {
          return;
        }
        console.log(
          `   ${idx + 1}. ${colors.green}${reviewer.name}${colors.reset} (${reviewer.email}) - ${
            reviewer.commits
          } commits`
        );
      });
      console.log('');
    }

    // 準備選項列表
    const options = [];

    // 加入團隊選項
    const teamsList = Object.values(teams);
    teamsList.forEach((team) => {
      const memberCount = team.members.length;
      const memberNames = team.members
        .slice(0, 3)
        .map((m) => m.name)
        .join(', ');
      const moreText = memberCount > 3 ? ` ... +${memberCount - 3} 人` : '';

      options.push({
        type: 'team',
        slug: team.slug,
        label: `👥 ${team.name}`,
        extra: ` ${colors.blue}(${team.slug} - ${memberCount} 位成員: ${memberNames}${moreText})${colors.reset}`,
      });
    });

    // 收集所有個人成員
    const allMembersMap = new Map();

    Object.values(teams).forEach((team) => {
      team.members.forEach((member) => {
        if (!currentUser || member.login !== currentUser.githubUser) {
          allMembersMap.set(member.login, member);
        }
      });
    });

    orgMembers.forEach((member) => {
      if (!currentUser || member.login !== currentUser.githubUser) {
        allMembersMap.set(member.login, member);
      }
    });

    const uniqueMembers = Array.from(allMembersMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // 加入個人成員選項
    uniqueMembers.forEach((member) => {
      options.push({
        type: 'individual',
        login: member.login,
        label: `👤 @${member.login}`,
        extra: ` ${colors.magenta}(${member.name})${colors.reset}`,
      });
    });

    if (options.length === 0) {
      console.log(`${colors.yellow}未找到可用的 reviewers${colors.reset}`);
      console.log(`${colors.blue}提示: 你仍可以在創建 PR 後手動添加 reviewers${colors.reset}\n`);
      return { teams: [], individuals: [] };
    }

    console.log(
      `${colors.green}找到 ${teamsList.length} 個團隊和 ${uniqueMembers.length} 位成員${colors.reset}\n`
    );

    // 使用互動式選擇
    const selector = new InteractiveSelect();
    const result = await selector.select(options, '🎯 選擇 Reviewers');

    if (result.cancelled || result.selected.length === 0) {
      console.log(`${colors.yellow}未選擇任何 reviewer${colors.reset}\n`);
      return { teams: [], individuals: [] };
    }

    // 分類選中的項目
    const selectedTeams = [];
    const selectedIndividuals = [];

    result.selected.forEach((item) => {
      if (item.type === 'team') {
        selectedTeams.push(item.slug);
      } else if (item.type === 'individual') {
        selectedIndividuals.push(item.login);
      }
    });

    // 應用 excludeAuthors 過濾（優先順序最高）
    const filteredIndividuals = selectedIndividuals.filter((login) => {
      const shouldExclude = this.excludeAuthors.some((excluded) => {
        const normalizedExcluded = excluded.toLowerCase();
        return login.toLowerCase().includes(normalizedExcluded);
      });
      
      if (shouldExclude) {
        log.warning(`已排除 @${login}（在 excludeAuthors 列表中）`);
      }
      
      return !shouldExclude;
    });

    console.log('');
    if (selectedTeams.length > 0) {
      log.success(`已選擇團隊: ${selectedTeams.join(', ')}`);
    }
    if (filteredIndividuals.length > 0) {
      log.success(`已選擇個人: ${filteredIndividuals.map((u) => `@${u}`).join(', ')}`);
    }
    console.log('');

    return { teams: selectedTeams, individuals: filteredIndividuals };
  }

  /**
   * 自動選擇 Reviewers（非互動模式）
   */
  autoSelectReviewers(suggestedReviewers, currentUser) {
    const reviewers = suggestedReviewers
      .filter((r) => {
        // 過濾當前用戶
        if (currentUser && r.email.toLowerCase() === currentUser.email.toLowerCase()) {
          return false;
        }
        // 過濾排除列表中的作者
        const shouldExclude = this.excludeAuthors.some((excluded) => {
          const normalizedExcluded = excluded.toLowerCase();
          return (
            r.email.toLowerCase().includes(normalizedExcluded) ||
            (r.name && r.name.toLowerCase().includes(normalizedExcluded))
          );
        });
        return !shouldExclude;
      })
      .slice(0, CONSTANTS.AUTO_REVIEWERS_COUNT)
      .map((r) => r.email.split('@')[0]);

    return { teams: [], individuals: reviewers };
  }

  /**
   * 選擇 Reviewers（互動模式）
   */
  async select(teamsData, suggestedReviewers, currentUser) {
    // 此方法現在只在 interactiveReviewers: true 時被調用
    return this.selectInteractive(teamsData, suggestedReviewers, currentUser);
  }
}
