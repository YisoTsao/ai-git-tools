import { execFileSync } from 'child_process';
import { GitOperations } from '../core/git-operations.js';

/**
 * 解析 release branch 名稱中的版本 token
 * @param {string} branchName
 * @returns {{year: number, cycle: number, patch: number, cadence: string} | null}
 */
export function parseReleaseVersion(branchName) {
  const normalized = branchName.replace(/^origin\//, '');
  const semverMatch = normalized.match(/^release-(\d+)\.(\d+)\.(\d+)$/i);
  if (semverMatch) {
    return {
      major: Number(semverMatch[1]),
      minor: Number(semverMatch[2]),
      patch: Number(semverMatch[3]),
      cadence: 'semver',
    };
  }

  const match = normalized.match(/^release-(\d{4})-([mw])(\d+)(?:\.(\d+))?$/i);
  if (!match) return null;

  return {
    year: Number(match[1]),
    cycle: Number(match[3]),
    patch: Number(match[4] || 0),
    cadence: match[2].toLowerCase(),
  };
}

/**
 * 依版本號選擇最新 release branch
 * @param {string[]} branches
 * @returns {string | null}
 */
export function selectLatestReleaseBranch(branches = []) {
  const normalized = branches
    .map(branch => branch.replace(/^origin\//, ''))
    .filter(branch => branch.startsWith('release-'));
  const monthly = normalized.filter(branch => parseReleaseVersion(branch)?.cadence === 'm');
  const weekly = normalized.filter(branch => parseReleaseVersion(branch)?.cadence === 'w');
  const semver = normalized.filter(branch => parseReleaseVersion(branch)?.cadence === 'semver');
  const candidates = monthly.length > 0 ? monthly : weekly.length > 0 ? weekly : semver;

  return candidates
    .filter(branch => parseReleaseVersion(branch))
    .sort((left, right) => {
      const leftVersion = parseReleaseVersion(left);
      const rightVersion = parseReleaseVersion(right);
      if (leftVersion.cadence === 'semver' && rightVersion.cadence === 'semver') {
        return (
          rightVersion.major - leftVersion.major ||
          rightVersion.minor - leftVersion.minor ||
          rightVersion.patch - leftVersion.patch
        );
      }
      return (
        rightVersion.year - leftVersion.year ||
        rightVersion.cycle - leftVersion.cycle ||
        rightVersion.patch - leftVersion.patch
      );
    })[0] || null;
}

/**
 * 從 GitHub remote 解析 repository
 * @param {string} remoteUrl
 * @returns {{owner: string, repo: string} | null}
 */
export function parseGitHubRemote(remoteUrl = '') {
  const match = remoteUrl.trim().match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function run(command, args, execImpl = execFileSync) {
  return execImpl(command, args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function getRemoteBranches(execImpl) {
  const remoteUrl = run('git', ['remote', 'get-url', 'origin'], execImpl);
  const repository = parseGitHubRemote(remoteUrl);
  if (!repository) throw new Error('無法從 origin remote 解析 GitHub repository');

  const output = run(
    'gh',
    ['api', `repos/${repository.owner}/${repository.repo}/branches`, '--paginate', '--jq', '.[].name'],
    execImpl
  );
  return output.split('\n').filter(Boolean);
}

function getLocalRemoteBranches(execImpl) {
  try {
    execImpl('git', ['fetch', '--prune', 'origin'], { stdio: 'ignore' });
  } catch {
    // 使用本機已快取的 remote branches
  }

  return run('git', ['branch', '-r'], execImpl)
    .split('\n')
    .map(branch => branch.trim().replace(/^origin\//, ''))
    .filter(Boolean);
}

/**
 * 解析要比較的 base branch
 * @param {{baseBranch?: string, execImpl?: Function}} options
 * @returns {{branch: string, source: string}}
 */
export function resolveBaseBranch({ baseBranch, execImpl = execFileSync } = {}) {
  if (baseBranch) return { branch: baseBranch.replace(/^origin\//, ''), source: 'explicit' };

  let branches;
  try {
    branches = getRemoteBranches(execImpl);
  } catch {
    branches = getLocalRemoteBranches(execImpl);
  }

  const branch = selectLatestReleaseBranch(branches);
  if (!branch) {
    throw new Error('找不到可用的 release branch，請使用 --base <branch> 指定比較基準');
  }
  return { branch, source: 'latest-versioned-release' };
}

/**
 * 收集目前 branch 相對於 base 的 Git 變更
 * @param {{baseBranch?: string, headBranch?: string, git?: typeof GitOperations}} options
 * @returns {object}
 */
export function collectGitEvidence({ baseBranch, headBranch, git = GitOperations, execImpl = execFileSync } = {}) {
  const resolvedBase = resolveBaseBranch({ baseBranch, execImpl });
  const head = headBranch || git.getCurrentBranch();
  let repository = null;
  try {
    repository = parseGitHubRemote(run('git', ['remote', 'get-url', 'origin'], execImpl));
  } catch {
    // 本地分析仍可使用 Git evidence，不要求 repository metadata
  }

  return {
    currentBranch: head,
    baseBranch: resolvedBase.branch,
    baseSource: resolvedBase.source,
    repository: repository ? `${repository.owner}/${repository.repo}` : null,
    commits: git.getCommits(resolvedBase.branch, head, { useRemoteHead: false }),
    changedFiles: git.getChangedFiles(resolvedBase.branch, head, false),
    diff: git.truncateDiff(git.getDiff(resolvedBase.branch, head, false)),
    stats: git.getChangeStats(resolvedBase.branch, head, false),
  };
}

/**
 * 取得可選的 GitHub PR evidence
 * @param {number|string} pullRequestNumber
 * @param {Function} execImpl
 * @returns {object}
 */
export function collectPullRequestEvidence(pullRequestNumber, execImpl = execFileSync) {
  const raw = run(
    'gh',
    [
      'pr',
      'view',
      String(pullRequestNumber),
      '--json',
      'title,body,url,state,mergedAt,commits,files',
    ],
    execImpl
  );
  const pullRequest = JSON.parse(raw);

  return {
    number: Number(pullRequestNumber),
    title: pullRequest.title || '',
    body: pullRequest.body || '',
    url: pullRequest.url || '',
    state: pullRequest.state || '',
    mergedAt: pullRequest.mergedAt || null,
    commits: pullRequest.commits || [],
    changedFiles: pullRequest.files || [],
  };
}

/**
 * 依目前 branch 找到對應的 GitHub Pull Request
 * @param {string} branchName
 * @param {Function} execImpl
 * @returns {object|null}
 */
export function findCurrentPullRequestEvidence(branchName, execImpl = execFileSync) {
  const raw = run(
    'gh',
    [
      'pr',
      'list',
      '--head',
      branchName,
      '--state',
      'all',
      '--limit',
      '1',
      '--json',
      'number,title,body,url,state,mergedAt,commits,files',
    ],
    execImpl
  );
  const pullRequests = JSON.parse(raw);
  if (!Array.isArray(pullRequests) || pullRequests.length === 0) return null;

  const pullRequest = pullRequests[0];
  return {
    number: Number(pullRequest.number),
    title: pullRequest.title || '',
    body: pullRequest.body || '',
    url: pullRequest.url || '',
    state: pullRequest.state || '',
    mergedAt: pullRequest.mergedAt || null,
    commits: pullRequest.commits || [],
    changedFiles: pullRequest.files || [],
  };
}
