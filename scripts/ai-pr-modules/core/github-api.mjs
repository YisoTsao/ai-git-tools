import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { log } from '../utils/helpers.mjs';
import { colors } from '../utils/constants.mjs';

/**
 * GitHub API 操作封裝
 */
export class GitHubAPI {
  constructor() {
    // 自動從 git remote 偵測組織名稱
    this.orgName = this.detectOrgFromRemote();
  }

  /**
   * 從 git remote URL 自動偵測組織名稱
   */
  detectOrgFromRemote() {
    try {
      const remoteUrl = execSync('git remote get-url origin', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      // 解析 HTTPS 格式: https://github.com/org/repo.git
      const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\//); 
      if (httpsMatch) {
        log.info(`自動偵測組織名稱: ${httpsMatch[1]}\n`);
        return httpsMatch[1];
      }

      // 解析 SSH 格式: git@github.com:org/repo.git
      const sshMatch = remoteUrl.match(/github\.com:([^/]+)\//); 
      if (sshMatch) {
        log.info(`自動偵測組織名稱: ${sshMatch[1]}\n`);
        return sshMatch[1];
      }

      log.warning('無法從 git remote 偵測組織名稱');
      return null;
    } catch (error) {
      log.warning('無法從 git remote 偵測組織名稱');
      return null;
    }
  }

  /**
   * 安全刪除檔案（如果存在）
   */
  safeUnlink(filePath) {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch (error) {
      // 忽略刪除錯誤
      log.warning(`⚠️  無法刪除臨時檔案: ${filePath}`);
    }
  }

  /**
   * 檢查 GitHub CLI 認證狀態
   */
  checkAuth() {
    try {
      execSync('gh api user --jq .login', { stdio: 'pipe' });
      return { authenticated: true };
    } catch (error) {
      return { authenticated: false };
    }
  }

  /**
   * 從 GitHub 抓取組織的成員列表
   */
  async fetchOrgMembers(orgName = this.orgName) {
    try {
      log.step(`正在嘗試抓取 ${orgName} 組織的成員列表...`);

      const membersJson = execSync(`gh api orgs/${orgName}/members --jq '.'`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const membersData = JSON.parse(membersJson);
      const members = membersData.map((member) => ({
        login: member.login,
        name: member.name || member.login,
      }));

      if (members.length > 0) {
        log.success(`成功抓取 ${members.length} 位組織成員\n`);
        return members;
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 從 GitHub 抓取組織的團隊列表
   */
  async fetchTeams(orgName = this.orgName) {
    try {
      // 先檢查認證狀態
      const authStatus = this.checkAuth();
      if (!authStatus.authenticated) {
        log.warning('GitHub CLI 未認證');
        log.info('請執行: gh auth login\n');
        return { teams: {}, members: [] };
      }

      log.step(`正在從 GitHub 抓取 ${orgName} 的團隊資訊...`);

      let teamsJson;
      try {
        teamsJson = execSync(`gh api orgs/${orgName}/teams --jq '.'`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (error) {
        // 無法存取團隊 API，使用替代方案
        log.warning('無法存取組織團隊資訊（可能是權限問題）');
        log.info('嘗試使用替代方案：直接抓取組織成員...\n');

        const members = await this.fetchOrgMembers(orgName);
        if (members.length > 0) {
          return { teams: {}, members };
        }

        throw error;
      }

      const teams = JSON.parse(teamsJson);

      if (!teams || teams.length === 0) {
        log.warning('未找到任何團隊，嘗試直接抓取組織成員...');
        const members = await this.fetchOrgMembers(orgName);
        return { teams: {}, members };
      }

      const teamData = {};

      for (const team of teams) {
        try {
          const membersJson = execSync(
            `gh api orgs/${orgName}/teams/${team.slug}/members --jq '.'`,
            {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
            }
          );

          const members = JSON.parse(membersJson);
          teamData[team.slug] = {
            name: team.name,
            slug: team.slug,
            description: team.description || '',
            members: members.map((m) => ({
              login: m.login,
              name: m.name || m.login,
            })),
          };
        } catch (error) {
          log.warning(`無法抓取團隊 ${team.slug} 的成員: ${error.message}`);
        }
      }

      // 同時取得所有成員作為備選
      const allMembers = await this.fetchOrgMembers(orgName);

      log.success(
        `成功抓取 ${Object.keys(teamData).length} 個團隊和 ${allMembers.length} 位成員\n`
      );
      return { teams: teamData, members: allMembers };
    } catch (error) {
      log.warning('無法從 GitHub 抓取資訊');
      log.info('請確認：');
      console.log('  1. 已安裝 GitHub CLI: brew install gh');
      console.log('  2. 已執行認證: gh auth login');
      console.log('  3. 選擇正確的認證範圍（需要 read:org 權限）');
      console.log(`  4. 有權限存取 ${orgName} 組織\n`);

      log.info('提示: 你仍可以手動輸入 reviewer 的 GitHub username\n');

      return { teams: {}, members: [] };
    }
  }

  /**
   * 創建或更新 PR
   */
  async createOrUpdatePR(params) {
    const { title, body, baseBranch, headBranch, reviewers, forceNew } = params;
    const bodyFile = '/tmp/pr-body.md';
    writeFileSync(bodyFile, body);

    try {
      // 檢查 PR 是否已存在（除非強制創建新 PR）
      let existingPRUrl = null;
      if (!forceNew) {
        try {
          existingPRUrl = execSync(
            `gh pr list --head "${headBranch}" --base "${baseBranch}" --json url --jq '.[0].url'`,
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
          ).trim();
        } catch (error) {
          // PR 不存在
        }
      }

      const escapedTitle = title.replace(/"/g, '\\"');

      if (existingPRUrl) {
        // 更新現有 PR
        log.step('偵測到現有 PR，正在更新內容...');

        const updateCmd = `gh pr edit "${existingPRUrl}" --title "${escapedTitle}" --body-file "${bodyFile}"`;
        execSync(updateCmd, { stdio: 'inherit' });

        // 更新 reviewers
        if (reviewers) {
          await this.addReviewers(existingPRUrl, reviewers);
        }

        log.success('Pull Request 已更新！');
        console.log(`🔗 ${existingPRUrl}\n`);

        this.safeUnlink(bodyFile);
        return existingPRUrl;
      } else {
        // 創建新 PR
        log.step('正在創建 Pull Request...');

        // 如果有 orgName 且是組織 repo，使用完整的分支格式
        // 如果沒有 orgName，直接使用分支名稱（gh CLI 會自動處理）
        let headRef = headBranch;
        if (headBranch.includes(':')) {
          headRef = headBranch;
        } else if (this.orgName) {
          headRef = `${this.orgName}:${headBranch}`;
        }
        const createCmd = `gh pr create --base "${baseBranch}" --head "${headRef}" --title "${escapedTitle}" --body-file "${bodyFile}"`;

        try {
          const result = execSync(createCmd, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          log.success('Pull Request 創建成功！');

          // 提取 PR URL
          const prUrl = result
            .trim()
            .split('\n')
            .find((line) => line.includes('https://'));

          if (prUrl) {
            console.log(`🔗 ${prUrl}`);

            // 添加 reviewers
            if (reviewers) {
              const prNumber = prUrl.split('/').pop();
              await this.addReviewersByAPI(prNumber, reviewers);
            }
          }

          this.safeUnlink(bodyFile);
          return prUrl;
        } catch (error) {
          this.safeUnlink(bodyFile);
          throw error;
        }
      }
    } catch (error) {
      this.safeUnlink(bodyFile);
      throw error;
    }
  }

  /**
   * 添加 Reviewers (給已存在的 PR)
   */
  async addReviewers(prUrl, reviewers) {
    if (!reviewers) return;

    const prNumber = prUrl.split('/').pop();

    if (reviewers.individuals && reviewers.individuals.length > 0) {
      await this.addReviewersByAPI(prNumber, { individuals: reviewers.individuals });
    }

    if (reviewers.teams && reviewers.teams.length > 0) {
      await this.addTeamReviewers(prNumber, reviewers.teams);
    }
  }

  /**
   * 使用 API 添加個人 Reviewers
   */
  async addReviewersByAPI(prNumber, reviewers) {
    if (!reviewers.individuals || reviewers.individuals.length === 0) return;

    log.info(`正在添加個人 Reviewers (共 ${reviewers.individuals.length} 位)...`);
    console.log(
      `${colors.blue}準備添加: ${reviewers.individuals.map((r) => `@${r}`).join(', ')}${
        colors.reset
      }\n`
    );

    const successfulReviewers = [];
    const failedReviewers = [];

    for (const username of reviewers.individuals) {
      try {
        console.log(`${colors.cyan}正在添加 @${username}...${colors.reset}`);

        const requestBody = JSON.stringify({ reviewers: [username] });

        execSync(
          `printf '%s' '${requestBody.replace(
            /'/g,
            "'\\''"
          )}' | gh api repos/:owner/:repo/pulls/${prNumber}/requested_reviewers --input - -X POST`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );

        // 等待 GitHub 處理
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 驗證是否成功
        const verifyResponse = execSync(
          `gh api repos/:owner/:repo/pulls/${prNumber} --jq '.requested_reviewers[].login'`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        ).trim();

        const currentReviewers = verifyResponse.split('\n').filter(Boolean);

        if (currentReviewers.includes(username)) {
          console.log(`  ${colors.green}✓ 成功添加 @${username}${colors.reset}\n`);
          successfulReviewers.push(username);
        } else {
          console.log(`  ${colors.yellow}⚠ 無法添加 @${username}${colors.reset}\n`);
          failedReviewers.push({ username, reason: 'API 調用成功但未添加' });
        }
      } catch (error) {
        console.log(`  ${colors.red}✗ 失敗: ${error.message}${colors.reset}\n`);
        failedReviewers.push({ username, reason: error.message });
      }
    }

    // 顯示結果
    if (successfulReviewers.length > 0) {
      log.success(`成功添加 ${successfulReviewers.length} 位 Reviewers`);
    }

    if (failedReviewers.length > 0) {
      log.warning(`失敗 ${failedReviewers.length} 位，請手動添加`);
    }
  }

  /**
   * 添加團隊 Reviewers
   */
  async addTeamReviewers(prNumber, teams) {
    if (!teams || teams.length === 0) return;

    try {
      log.info('正在添加團隊 Reviewers...');
      const requestBody = JSON.stringify({ team_reviewers: teams });

      execSync(
        `printf '%s' '${requestBody.replace(
          /'/g,
          "'\\''"
        )}' | gh api repos/:owner/:repo/pulls/${prNumber}/requested_reviewers --input - -X POST`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 驗證
      const verifyResponse = execSync(
        `gh api repos/:owner/:repo/pulls/${prNumber} --jq '.requested_teams[].slug'`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();

      const actualTeams = verifyResponse.split('\n').filter(Boolean);

      if (actualTeams.length > 0) {
        log.success(`成功添加團隊: ${actualTeams.join(', ')}`);
      }
    } catch (error) {
      log.error('無法添加團隊 reviewers，請手動操作');
    }
  }
}
