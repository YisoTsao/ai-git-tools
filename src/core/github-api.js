/**
 * GitHub API 工具
 * 
 * 封裝 GitHub CLI 操作
 */

import { execSync } from 'child_process';

export class GitHubAPI {
  /**
   * 執行 gh 命令
   */
  static exec(command, options = {}) {
    try {
      return execSync(`gh ${command}`, {
        encoding: 'utf-8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options,
      }).toString();
    } catch (error) {
      if (options.throwOnError !== false) {
        throw error;
      }
      return '';
    }
  }

  /**
   * 檢查 GitHub CLI 是否已安裝並已認證
   */
  static isAvailable() {
    try {
      GitHubAPI.exec('--version', { silent: true });
      GitHubAPI.exec('auth status', { silent: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 創建 Pull Request
   */
  static createPR(options = {}) {
    const {
      title,
      body,
      base,
      head,
      draft = false,
      reviewers = [],
      labels = [],
    } = options;

    let command = 'pr create';
    
    if (title) command += ` --title "${title.replace(/"/g, '\\"')}"`;
    if (body) command += ` --body "${body.replace(/"/g, '\\"')}"`;
    if (base) command += ` --base "${base}"`;
    if (head) command += ` --head "${head}"`;
    if (draft) command += ' --draft';
    
    if (reviewers.length > 0) {
      command += ` --reviewer ${reviewers.join(',')}`;
    }
    
    if (labels.length > 0) {
      command += ` --label ${labels.join(',')}`;
    }

    return GitHubAPI.exec(command);
  }

  /**
   * 獲取最新的 release 分支
   */
  static getLatestReleaseBranch() {
    try {
      const output = GitHubAPI.exec('api repos/{owner}/{repo}/branches --jq ".[].name"', {
        silent: true,
      });
      
      const branches = output.split('\n').filter(line => line.trim());
      const releaseBranches = branches
        .filter(branch => branch.startsWith('release-'))
        .sort()
        .reverse();
      
      return releaseBranches[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * 檢查 PR 是否已存在
   */
  static prExists(base, head) {
    try {
      const output = GitHubAPI.exec(
        `pr list --base ${base} --head ${head} --json number --jq "length"`,
        { silent: true, throwOnError: false }
      );
      
      return parseInt(output.trim()) > 0;
    } catch {
      return false;
    }
  }

  /**
   * 獲取倉庫資訊
   */
  static getRepoInfo() {
    try {
      const output = GitHubAPI.exec('repo view --json owner,name', { silent: true });
      const data = JSON.parse(output);
      
      return {
        owner: data.owner?.login || null,
        name: data.name || null,
      };
    } catch {
      return { owner: null, name: null };
    }
  }

  /**
   * 獲取可用的 Labels
   */
  static getLabels() {
    try {
      const output = GitHubAPI.exec('label list --json name --jq ".[].name"', { silent: true });
      return output.split('\n').filter(line => line.trim());
    } catch {
      return [];
    }
  }
}
