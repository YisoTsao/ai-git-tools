import { execSync } from 'child_process';
import { CONSTANTS } from '../utils/constants.js';
import { PRError } from '../utils/helpers.js';

/**
 * Git 操作封裝
 */
export class GitOperations {
  /**
   * 偵測可用的 release 分支
   */
  detectReleaseBranches() {
    try {
      // 嘗試同步遠端，失敗就用本機已知的遠端資訊
      try {
        execSync('git fetch origin', { stdio: 'ignore', timeout: 15000 });
      } catch (_) {
        // fetch 失敗，繼續使用已經 cache 的遠端分支
      }
      const branches = execSync('git branch -r', { encoding: 'utf-8' })
        .split('\n')
        .map((b) => b.trim())
        .filter((b) => b.startsWith('origin/release-'))
        .map((b) => b.replace('origin/', ''));
      return branches;
    } catch (error) {
      return [];
    }
  }

  /**
   * 找到最新的 release 分支
   */
  findLatestReleaseBranch() {
    const branches = this.detectReleaseBranches();
    if (branches.length === 0) return null;

    // 優先選月分支(-m)，其次週分支(-w)，最後 fallback 到全部 release 分支
    const monthlyBranches = branches.filter((b) => b.includes('-m'));
    const weeklyBranches = branches.filter((b) => b.includes('-w'));
    const priorityBranches =
      monthlyBranches.length > 0
        ? monthlyBranches
        : weeklyBranches.length > 0
          ? weeklyBranches
          : branches;

    priorityBranches.sort().reverse();
    return priorityBranches[0] || null;
  }

  /**
   * 獲取當前分支
   */
  getCurrentBranch() {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  }

  /**
   * 獲取變更統計
   */
  getChangeStats(baseBranch, headBranch, useRemoteHead = false) {
    try {
      // 使用本地 headBranch 以確保能檢測到未推送的變更
      const headRef = useRemoteHead ? `origin/${headBranch}` : headBranch;
      const stats = execSync(`git diff --shortstat origin/${baseBranch}...${headRef}`, {
        encoding: 'utf-8',
      }).trim();

      const filesChanged = execSync(
        `git diff --name-only origin/${baseBranch}...${headRef} | wc -l`,
        { encoding: 'utf-8' }
      ).trim();

      return { stats, filesChanged: parseInt(filesChanged, 10) };
    } catch (error) {
      return { stats: '無法獲取統計', filesChanged: 0 };
    }
  }

  /**
   * 獲取變更的檔案列表
   */
  getChangedFiles(baseBranch, headBranch, useRemoteHead = false) {
    try {
      // 使用本地 headBranch 以確保能檢測到未推送的變更
      const headRef = useRemoteHead ? `origin/${headBranch}` : headBranch;
      const files = execSync(`git diff --name-only origin/${baseBranch}...${headRef}`, {
        encoding: 'utf-8',
      })
        .split('\n')
        .filter(Boolean);
      return files;
    } catch (error) {
      return [];
    }
  }

  /**
   * 獲取 commit 列表
   */
  getCommits(baseBranch, headBranch, options = {}) {
    const { oneline = true, noDecorate = true, useRemoteHead = false } = options;
    try {
      // 使用本地 headBranch 以確保能檢測到未推送的 commit
      const headRef = useRemoteHead ? `origin/${headBranch}` : headBranch;
      let cmd = `git log origin/${baseBranch}..${headRef}`;
      if (oneline) cmd += ' --oneline';
      if (noDecorate) cmd += ' --no-decorate';

      return execSync(cmd, { encoding: 'utf-8' });
    } catch (error) {
      throw new PRError(
        '無法比較分支差異',
        'GIT_COMPARE_FAILED',
        ['檢查遠端分支是否存在: git branch -r', '執行診斷: npm run diagnose:pr'],
        `git log origin/${baseBranch}..${headBranch}`
      );
    }
  }

  /**
   * 獲取 diff
   */
  getDiff(baseBranch, headBranch, useRemoteHead = false, maxBuffer = CONSTANTS.MAX_BUFFER_SIZE) {
    try {
      // 使用本地 headBranch 以確保能檢測到未推送的變更
      const headRef = useRemoteHead ? `origin/${headBranch}` : headBranch;
      return execSync(`git diff origin/${baseBranch}...${headRef}`, {
        encoding: 'utf-8',
        maxBuffer,
      });
    } catch (error) {
      // 嘗試替代方案
      const headRef = useRemoteHead ? `origin/${headBranch}` : headBranch;
      return execSync(`git diff origin/${baseBranch}..${headRef}`, {
        encoding: 'utf-8',
        maxBuffer,
      });
    }
  }

  /**
   * 推送到遠端
   */
  async push(branch) {
    try {
      execSync(`git push -u origin ${branch}`, {
        stdio: ['ignore', 'inherit', 'pipe'],
        encoding: 'utf-8',
      });
      return true;
    } catch (error) {
      const errMsg = (error.stderr || error.message || '').toString();
      const is403 = errMsg.includes('403') || errMsg.includes('Write access') || errMsg.includes('write access');
      if (is403) {
        throw new PRError(
          '\u63a8送失敗：git 沒有寫入權限',
          'GIT_PUSH_FORBIDDEN',
          [
            '建議執行以下指令讓 git 使用 gh 的認證:',
            '  gh auth setup-git',
            '或者改用 SSH 權限:',
            '  git remote set-url origin git@github.com:<org>/<repo>.git',
          ],
          `git push -u origin ${branch}`
        );
      }
      throw new PRError(
        '推送失敗',
        'GIT_PUSH_FAILED',
        ['檢查是否有推送權限', '檢查遠端分支是否有衝突', '檢查網路連接'],
        `git push -u origin ${branch}`
      );
    }
  }

  /**
   * 同步遠端資訊
   */
  async fetch() {
    try {
      execSync('git fetch origin', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 智能截斷 diff
   */
  truncateDiff(diff, maxLength = CONSTANTS.MAX_DIFF_LENGTH) {
    if (diff.length <= maxLength) return diff;

    const lines = diff.split('\n');
    const header = lines.slice(0, CONSTANTS.DIFF_CONTEXT_LINES).join('\n');
    const footer = lines.slice(-CONSTANTS.DIFF_CONTEXT_LINES).join('\n');

    const middle = `\n\n... [已省略 ${lines.length - 100} 行變更] ...\n\n`;

    return header + middle + footer;
  }

  /**
   * 獲取當前用戶資訊
   */
  getCurrentUser() {
    try {
      const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
      const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
      let githubUser = null;

      try {
        githubUser = execSync('gh api user --jq .login', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
      } catch {
        // GitHub CLI 未認證或未安裝
      }

      return { email, name, githubUser };
    } catch (error) {
      return null;
    }
  }

  /**
   * 獲取 repository owner
   */
  getRepoOwner() {
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', {
        encoding: 'utf-8',
      }).trim();

      // 解析 GitHub URL
      const httpsMatch = remoteUrl.match(/github\.com[/:]([^/]+)\//);
      const sshMatch = remoteUrl.match(/github\.com:([^/]+)\//);

      const owner = httpsMatch?.[1] || sshMatch?.[1];
      return owner || null;
    } catch (error) {
      return null;
    }
  }
}
