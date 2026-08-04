/**
 * Git 操作封裝
 * 統一 commit 與 PR 命令的 Git 操作
 */

import { execSync } from 'child_process';
import { CONSTANTS } from '../utils/constants.js';
import { PRError } from '../utils/helpers.js';

const MAX_BUFFER_SIZE = CONSTANTS.MAX_BUFFER_SIZE;
const DIFF_CONTEXT_LINES = CONSTANTS.DIFF_CONTEXT_LINES;

export class GitOperations {
  /**
   * 執行 Git 命令
   */
  static exec(command, options = {}) {
    try {
      const result = execSync(command, {
        encoding: 'utf-8',
        stdio: options.silent ? 'pipe' : 'inherit',
        maxBuffer: MAX_BUFFER_SIZE,
        ...options,
      });
      return result ? result.toString().trim() : '';
    } catch (error) {
      if (options.throwOnError !== false) {
        throw error;
      }
      return '';
    }
  }

  /**
   * 檢查是否在 Git 倉庫中
   */
  static isGitRepository() {
    try {
      GitOperations.exec('git rev-parse --git-dir', { silent: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 獲取目前分支
   */
  static getCurrentBranch() {
    return GitOperations.exec('git rev-parse --abbrev-ref HEAD', { silent: true });
  }

  /**
   * 獲取 staged diff
   */
  static getStagedDiff() {
    return GitOperations.exec('git diff --staged', { silent: true });
  }

  /**
   * 偵測可用的 release 分支
   */
  static detectReleaseBranches() {
    try {
      try {
        execSync('git fetch --prune origin', { stdio: 'ignore', timeout: 15000 });
      } catch (_) {
        // fetch 失敗，繼續使用已經 cache 的遠端分支
      }
      const branches = execSync('git branch -r', { encoding: 'utf-8' })
        .toString()
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
  static findLatestReleaseBranch() {
    const branches = GitOperations.detectReleaseBranches();
    if (branches.length === 0) return null;

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
   * 獲取變更的檔案列表
   */
  static getChangedFiles(baseBranch, headBranch, useRemoteHead = false) {
    try {
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
  static getCommits(baseBranch, headBranch, options = {}) {
    const { oneline = true, noDecorate = true, useRemoteHead = false } = options;
    try {
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
  static getDiff(baseBranch, headBranch, useRemoteHead = false, maxBuffer = MAX_BUFFER_SIZE) {
    try {
      const headRef = useRemoteHead ? `origin/${headBranch}` : headBranch;
      return execSync(`git diff origin/${baseBranch}...${headRef}`, {
        encoding: 'utf-8',
        maxBuffer,
      });
    } catch (error) {
      const headRef = useRemoteHead ? `origin/${headBranch}` : headBranch;
      return execSync(`git diff origin/${baseBranch}..${headRef}`, {
        encoding: 'utf-8',
        maxBuffer,
      });
    }
  }

  /**
   * 智能截斷 diff
   * 保留前後各 50 行，中間用省略標記
   */
  static truncateDiff(diff, maxLength = CONSTANTS.MAX_DIFF_LENGTH) {
    if (diff.length <= maxLength) return diff;

    const lines = diff.split('\n');

    if (lines.length <= DIFF_CONTEXT_LINES * 2) {
      return diff;
    }

    const header = lines.slice(0, DIFF_CONTEXT_LINES).join('\n');
    const footer = lines.slice(-DIFF_CONTEXT_LINES).join('\n');

    return `${header}\n\n... [已省略 ${lines.length - DIFF_CONTEXT_LINES * 2} 行變更] ...\n\n${footer}`;
  }

  /**
   * 推送到遠端
   */
  static async push(branch) {
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
          '推送失敗：git 沒有寫入權限',
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
  static async fetch() {
    try {
      execSync('git fetch origin', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 獲取變更統計
   */
  static getChangeStats(baseBranch, headBranch, useRemoteHead = false) {
    try {
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
   * 獲取當前用戶資訊
   */
  static getCurrentUser() {
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
  static getRepoOwner() {
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', {
        encoding: 'utf-8',
      }).trim();

      const httpsMatch = remoteUrl.match(/github\.com[/:]([^/]+)\//);
      const sshMatch = remoteUrl.match(/github\.com:([^/]+)\//);

      const owner = httpsMatch?.[1] || sshMatch?.[1];
      return owner || null;
    } catch (error) {
      return null;
    }
  }
}
