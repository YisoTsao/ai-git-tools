/**
 * Git 操作工具
 * 
 * 封裝常用的 Git 命令操作
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

export class GitOperations {
  /**
   * 執行 Git 命令
   */
  static exec(command, options = {}) {
    try {
      return execSync(command, {
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
   * 獲取當前分支名稱
   */
  static getCurrentBranch() {
    return GitOperations.exec('git branch --show-current', { silent: true }).trim();
  }

  /**
   * 獲取遠端 URL
   */
  static getRemoteUrl(remoteName = 'origin') {
    return GitOperations.exec(`git remote get-url ${remoteName}`, { 
      silent: true,
      throwOnError: false,
    }).trim();
  }

  /**
   * 從遠端 URL 解析組織和倉庫名稱
   */
  static parseRemoteUrl(url) {
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return {
        org: match[1],
        repo: match[2],
      };
    }
    return { org: null, repo: null };
  }

  /**
   * 獲取 staged 變更的 diff
   */
  static getStagedDiff() {
    return GitOperations.exec('git diff --staged', { silent: true });
  }

  /**
   * 獲取所有未提交的變更
   */
  static getAllChanges() {
    const status = GitOperations.exec('git status --porcelain', { silent: true });
    
    if (!status.trim()) {
      return [];
    }

    const changes = [];
    const lines = status.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const statusCode = line.substring(0, 2);
      const filePath = line.substring(3).trim();

      // 跳過已刪除的檔案
      if (statusCode.includes('D')) {
        continue;
      }

      // 跳過不需要的檔案
      if (
        filePath.includes('node_modules/') ||
        filePath.includes('.next/') ||
        filePath.includes('dist/') ||
        filePath.includes('build/') ||
        filePath.includes('.DS_Store')
      ) {
        continue;
      }

      const isNew = statusCode.includes('?') || statusCode.includes('A');
      const isStaged = statusCode[0] !== ' ' && statusCode[0] !== '?';

      changes.push({
        filePath,
        isNew,
        isStaged,
        statusCode,
      });
    }

    return changes;
  }

  /**
   * 獲取檔案的變更內容
   */
  static getFileDiff(filePath, isNew = false) {
    try {
      if (isNew) {
        // 新檔案：讀取完整內容（前 100 行）
        if (!existsSync(filePath)) {
          return '[檔案不存在]';
        }
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, 100);
        return `[新檔案]\n${lines.join('\n')}${lines.length >= 100 ? '\n...' : ''}`;
      }
      
      // 已存在檔案：獲取 diff
      const diff = GitOperations.exec(`git diff HEAD -- "${filePath}"`, { 
        silent: true,
        throwOnError: false,
      });
      return diff || '[無變更]';
    } catch (error) {
      return `[讀取錯誤: ${error.message}]`;
    }
  }

  /**
   * Add 檔案
   */
  static addFile(filePath) {
    GitOperations.exec(`git add "${filePath}"`);
  }

  /**
   * Add 多個檔案
   */
  static addFiles(filePaths) {
    for (const filePath of filePaths) {
      GitOperations.addFile(filePath);
    }
  }

  /**
   * Reset staged 檔案
   */
  static resetStaged() {
    try {
      GitOperations.exec('git reset HEAD -- .', { silent: true, throwOnError: false });
    } catch {
      // 忽略錯誤
    }
  }

  /**
   * 執行 commit
   */
  static async commit(message) {
    // 使用臨時檔案避免 commit message 中的特殊字符問題
    const { writeFileSync, unlinkSync } = await import('fs');
    const tmpFile = '.git/COMMIT_EDITMSG_TMP';
    
    try {
      writeFileSync(tmpFile, message, 'utf-8');
      GitOperations.exec(`git commit -F ${tmpFile}`);
      unlinkSync(tmpFile);
    } catch (error) {
      try {
        unlinkSync(tmpFile);
      } catch {
        // 忽略刪除臨時檔案的錯誤
      }
      throw error;
    }
  }

  /**
   * 獲取最近的 commits
   */
  static getRecentCommits(count = 5) {
    return GitOperations.exec(`git log -${count} --oneline`, { silent: true });
  }

  /**
   * 獲取兩個分支之間的 diff
   */
  static getDiffBetweenBranches(base, head) {
    return GitOperations.exec(`git diff ${base}...${head}`, { silent: true });
  }

  /**
   * 獲取兩個分支之間的 commit 列表
   */
  static getCommitsBetweenBranches(base, head) {
    const output = GitOperations.exec(`git log ${base}..${head} --oneline`, { silent: true });
    return output.split('\n').filter(line => line.trim());
  }

  /**
   * 檢查分支是否存在
   */
  static branchExists(branchName) {
    try {
      GitOperations.exec(`git rev-parse --verify ${branchName}`, { 
        silent: true,
        throwOnError: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 獲取檔案的 Git 歷史貢獻者
   */
  static getFileContributors(filePath, depth = 20) {
    try {
      const output = GitOperations.exec(
        `git log -${depth} --pretty=format:"%ae|%an" -- "${filePath}"`,
        { silent: true, throwOnError: false }
      );
      
      const contributors = new Map();
      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const [email, name] = line.split('|');
        if (email && name) {
          contributors.set(email, name);
        }
      }
      
      return Array.from(contributors.entries()).map(([email, name]) => ({ email, name }));
    } catch {
      return [];
    }
  }
}
