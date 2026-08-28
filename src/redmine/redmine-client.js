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
    projectId: rawIssue.project_id || rawIssue.project?.id || null,
    trackerId: rawIssue.tracker_id || rawIssue.tracker?.id || null,
    priority: rawIssue.priority || null,
    priorityId: rawIssue.priority_id || rawIssue.priority?.id || null,
    parentId: rawIssue.parent_issue_id || rawIssue.parent?.id || null,
    children: Array.isArray(rawIssue.children)
      ? rawIssue.children.map(child => ({
        id: child.id,
        subject: child.subject || '',
        description: child.description || '',
      }))
      : [],
    relations: Array.isArray(rawIssue.relations)
      ? rawIssue.relations.map(relation => ({
        id: relation.id,
        issue_id: relation.issue_id ?? relation.issueId,
        issue_to_id: relation.issue_to_id ?? relation.issueToId,
        relation_type: relation.relation_type ?? relation.relationType,
      }))
      : [],
    journals: Array.isArray(rawIssue.journals) ? rawIssue.journals : [],
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
   * @param {{parentIssueId?: number|string, subject?: string, limit?: number}} filters
   * @returns {Promise<object[]>}
   */
  async listIssues({ parentIssueId, subject, limit = 100 } = {}) {
    const query = [];
    if (parentIssueId !== undefined && parentIssueId !== null) {
      query.push(`parent_id=${encodeURIComponent(parentIssueId)}`);
    }
    if (subject) query.push(`subject=${encodeURIComponent(subject)}`);
    if (limit !== undefined && limit !== null) query.push(`limit=${encodeURIComponent(limit)}`);
    const suffix = query.length > 0 ? `?${query.join('&')}` : '';
    const data = await this.request(`/issues.json${suffix}`);
    return (data.issues || []).map(normalizeIssue);
  }

  /**
   * @param {{projectId: number|string, trackerId: number|string, subject: string, description: string, parentIssueId: number|string, priorityId?: number|string|null, categoryId?: number|string|null, estimatedHours?: number|null, startDate?: string|null, dueDate?: string|null, customFields?: Array<object>}} input
   * @returns {Promise<object>}
   */
  async createIssue({
    projectId,
    trackerId,
    subject,
    description,
    parentIssueId,
    priorityId = null,
    categoryId = null,
    estimatedHours = null,
    startDate = null,
    dueDate = null,
    customFields = [],
  }) {
    if (projectId === undefined || projectId === null || trackerId === undefined || trackerId === null) {
      throw new Error('建立子 Issue 需要 projectId 與 trackerId');
    }
    if (!String(subject || '').trim() || !String(description || '').trim()) {
      throw new Error('建立子 Issue 需要 subject 與 description');
    }
    if (parentIssueId === undefined || parentIssueId === null) {
      throw new Error('建立子 Issue 需要 parentIssueId');
    }

    const issue = {
      project_id: projectId,
      tracker_id: trackerId,
      subject,
      description,
      parent_issue_id: parentIssueId,
    };
    if (priorityId !== undefined && priorityId !== null) issue.priority_id = priorityId;
    if (categoryId !== undefined && categoryId !== null) issue.category_id = categoryId;
    if (estimatedHours !== undefined && estimatedHours !== null) issue.estimated_hours = estimatedHours;
    if (startDate) issue.start_date = startDate;
    if (dueDate) issue.due_date = dueDate;
    if (Array.isArray(customFields) && customFields.length > 0) issue.custom_fields = customFields;

    const data = await this.request('/issues.json', { method: 'POST', json: { issue } });
    return data.issue || data;
  }

  /**
   * @param {number|string} issueId
   * @param {{targetIssueId: number|string, relationType: string}} relation
   * @returns {Promise<object>}
   */
  async createRelation(issueId, { targetIssueId, relationType }) {
    if (targetIssueId === undefined || targetIssueId === null || !relationType) {
      throw new Error('建立 relation 需要 targetIssueId 與 relationType');
    }
    return this.request(`/issues/${encodeURIComponent(issueId)}/relations.json`, {
      method: 'POST',
      json: { relation: { issue_to_id: targetIssueId, relation_type: relationType } },
    });
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
  async updateIssue(issueId, {
    statusId,
    doneRatio,
    dueDate,
    startDate,
    subject,
    description,
    notes,
    projectId,
    trackerId,
    priorityId,
    categoryId,
    estimatedHours,
    customFields,
  }) {
    const issue = {};
    if (projectId !== undefined && projectId !== null) issue.project_id = projectId;
    if (trackerId !== undefined && trackerId !== null) issue.tracker_id = trackerId;
    if (priorityId !== undefined && priorityId !== null) issue.priority_id = priorityId;
    if (categoryId !== undefined && categoryId !== null) issue.category_id = categoryId;
    if (subject !== undefined) issue.subject = subject;
    if (statusId !== undefined && statusId !== null) issue.status_id = statusId;
    if (doneRatio !== undefined && doneRatio !== null) issue.done_ratio = doneRatio;
    if (estimatedHours !== undefined && estimatedHours !== null) issue.estimated_hours = estimatedHours;
    if (startDate !== undefined && startDate !== null) issue.start_date = startDate;
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
