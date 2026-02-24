/**
 * Git 操作封裝
 * 基於 scripts/ai-pr-modules/core/git-operations.mjs
 */

import { execSync } from 'child_process';

const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
const DIFF_CONTEXT_LINES = 50;

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
      execSync('git fetch origin', { stdio: 'ignore' });
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
    const priorityBranches = monthlyBranches.length > 0 ? monthlyBranches : weeklyBranches;

    priorityBranches.sort().reverse();
    return priorityBranches[0];
  }

  /**
   * 獲取變更的檔案列表
   */
  static getChangedFiles(baseBranch, headBranch) {
    try {
      const files = execSync(`git diff --name-only origin/${baseBranch}...${headBranch}`, {
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
  static getCommits(baseBranch, headBranch) {
    try {
      return execSync(`git log origin/${baseBranch}..origin/${headBranch} --oneline`, {
        encoding: 'utf-8',
      });
    } catch (error) {
      throw new Error(`無法比較分支差異: ${error.message}`);
    }
  }

  /**
   * 獲取 diff
   */
  static getDiff(baseBranch, headBranch) {
    try {
      return execSync(`git diff origin/${baseBranch}...${headBranch}`, {
        encoding: 'utf-8',
        maxBuffer: MAX_BUFFER_SIZE,
      });
    } catch (error) {
      // 嘗試替代方案
      try {
        return execSync(`git diff origin/${baseBranch}..${headBranch}`, {
          encoding: 'utf-8',
          maxBuffer: MAX_BUFFER_SIZE,
        });
      } catch (fallbackError) {
        throw new Error(`無法獲取分支差異: ${error.message}`);
      }
    }
  }

  /**
   * 智能截斷 diff
   * 保留前後各 50 行，中間用省略標記
   */
  static truncateDiff(diff, maxLength = 8000) {
    if (diff.length <= maxLength) return diff;

    const lines = diff.split('\n');
    const contextLines = DIFF_CONTEXT_LINES;

    if (lines.length <= contextLines * 2) {
      return diff;
    }

    const header = lines.slice(0, contextLines).join('\n');
    const footer = lines.slice(-contextLines).join('\n');
    const omittedLines = lines.length - contextLines * 2;

    return `${header}\n\n... [已省略 ${omittedLines} 行變更] ...\n\n${footer}`;
  }

  /**
   * 推送到遠端
   */
  static push(branch) {
    try {
      execSync(`git push -u origin ${branch}`, { stdio: 'inherit' });
      return true;
    } catch (error) {
      throw new Error(`推送失敗: ${error.message}`);
    }
  }

  /**
   * 同步遠端資訊
   */
  static fetch() {
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
  static getChangeStats(baseBranch, headBranch) {
    try {
      const stats = execSync(`git diff --shortstat origin/${baseBranch}...${headBranch}`, {
        encoding: 'utf-8',
      }).trim();

      const filesChanged = execSync(
        `git diff --name-only origin/${baseBranch}...${headBranch} | wc -l`,
        { encoding: 'utf-8' }
      ).trim();

      return { stats, filesChanged: parseInt(filesChanged, 10) };
    } catch (error) {
      return { stats: '無法獲取統計', filesChanged: 0 };
    }
  }
}
