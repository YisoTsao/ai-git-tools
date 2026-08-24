/**
 * Redmine REST API 客戶端
 */

/**
 * @typedef {{id: number, name: string}} RedmineStatus
 */

export class RedmineAPIError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {string} method
   * @param {string} path
   */
  constructor(message, status, method, path) {
    super(message);
    this.name = 'RedmineAPIError';
    this.status = status;
    this.method = method;
    this.path = path;
  }
}

/**
 * 將 Redmine Issue response 轉成命令內部使用的資料
 * @param {object} rawIssue
 * @returns {object}
 */
export function normalizeIssue(rawIssue = {}) {
  return {
    id: rawIssue.id,
    subject: rawIssue.subject || '',
    description: rawIssue.description || '',
    status: rawIssue.status || null,
    tracker: rawIssue.tracker || null,
    parentId: rawIssue.parent_issue_id || rawIssue.parent?.id || null,
    customFields: rawIssue.custom_fields || rawIssue.customFields || [],
    allowedStatuses: rawIssue.allowed_statuses || rawIssue.allowedStatuses || [],
    project: rawIssue.project || null,
    assignedTo: rawIssue.assigned_to || rawIssue.assignedTo || null,
    raw: rawIssue,
  };
}

export class RedmineClient {
  /**
   * @param {{url: string, apiKey: string, fetchImpl?: typeof fetch}} config
   */
  constructor({ url, apiKey, fetchImpl = globalThis.fetch }) {
    if (!url || !apiKey) {
      throw new Error('RedmineClient 需要 url 與 apiKey');
    }
    if (typeof fetchImpl !== 'function') {
      throw new Error('目前 Node.js 環境沒有可用的 fetch');
    }

    this.baseUrl = url.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  /**
   * @param {string} path
   * @param {RequestInit & {json?: object}} options
   * @returns {Promise<object>}
   */
  async request(path, options = {}) {
    const { json, headers = {}, ...requestOptions } = options;
    const requestHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Redmine-API-Key': this.apiKey,
      ...headers,
    };

    if (json !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(json);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
    });
    const responseText = await response.text();
    let responseData = null;

    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = null;
      }
    }

    if (!response.ok) {
      const apiErrors = Array.isArray(responseData?.errors)
        ? `：${responseData.errors.join('、').replaceAll(this.apiKey, '[REDACTED]')}`
        : '';
      throw new RedmineAPIError(
        `Redmine API 請求失敗 (${response.status})${apiErrors}`,
        response.status,
        requestOptions.method || 'GET',
        path
      );
    }

    return responseData || {};
  }

  /**
   * @param {number|string} issueId
   * @returns {Promise<object>}
   */
  async getIssue(issueId, { include = 'allowed_statuses' } = {}) {
    const query = include ? `?include=${encodeURIComponent(include)}` : '';
    const data = await this.request(
      `/issues/${encodeURIComponent(issueId)}.json${query}`
    );
    return normalizeIssue(data.issue || data);
  }

  /**
   * @returns {Promise<RedmineStatus[]>}
   */
  async getIssueStatuses() {
    const data = await this.request('/issue_statuses.json');
    return data.issue_statuses || [];
  }

  /**
  * @param {number|string} issueId
  * @param {{statusId?: number, doneRatio?: number, dueDate?: string, description?: string, notes?: string, customFields?: Array<object>}} update
   * @returns {Promise<object>}
   */
  async updateIssue(issueId, { statusId, doneRatio, dueDate, description, notes, customFields }) {
    const issue = {};
    if (statusId !== undefined && statusId !== null) issue.status_id = statusId;
    if (doneRatio !== undefined && doneRatio !== null) issue.done_ratio = doneRatio;
    if (dueDate !== undefined && dueDate !== null) issue.due_date = dueDate;
    if (description !== undefined) issue.description = description;
    if (notes) issue.notes = notes;
    if (Array.isArray(customFields) && customFields.length > 0) {
      issue.custom_fields = customFields;
    }

    return this.request(`/issues/${encodeURIComponent(issueId)}.json`, {
      method: 'PUT',
      json: { issue },
    });
  }
}
