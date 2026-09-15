import { apiClient } from '@/lib/apiClient';
import {
  toCoverage,
  toContractDetail,
  toContractEvent,
  toContractRow,
  toContractSummary,
  toMergeField,
  toTemplate,
  toTemplateCreatePayload,
  toTemplateEditPayload,
  toTemplatePreview,
  toUnsentRow,
} from '@/lib/contractSchema';

/**
 * Contracts & templates — `compliance` app. Real backend as of the Sep 15
 * "contracts" commit: template lifecycle (draft → published → retired),
 * merge-field substitution, and a full signing pipeline (list/unsent/summary/
 * detail/timeline/send/void/remind/document). Split out of `bookingService.js`
 * once this grew past what that file should carry.
 */

const realContracts = {
  /* ------------------------------------------------------------- templates */

  async getCoverage() {
    const { data } = await apiClient.get('/contracts/templates/coverage/');
    return toCoverage(data);
  },

  /** All statuses (draft/published/retired) for one region+stay_type cell — the cell-detail history. */
  async getTemplatesForCell({ region, stayType }) {
    const { data } = await apiClient.get('/contracts/templates/', { params: { region, stay_type: stayType } });
    return (data?.results ?? data ?? []).map(toTemplate);
  },

  async getTemplates(params = {}) {
    const { data } = await apiClient.get('/contracts/templates/', {
      params: { ...(params.region ? { region: params.region } : {}), ...(params.stayType ? { stay_type: params.stayType } : {}) },
    });
    return (data?.results ?? data ?? []).map(toTemplate);
  },

  /** Always creates a draft — the server assigns `version` and `status`, never the client. */
  async createTemplateDraft(values) {
    const { data } = await apiClient.post('/contracts/templates/', toTemplateCreatePayload(values));
    return toTemplate(data);
  },

  /** Draft-only — `409 {code: 'not_editable'}` otherwise. Only `name`/`content` are accepted. */
  async updateTemplateDraft(id, patch) {
    const { data } = await apiClient.patch(`/contracts/templates/${id}/`, toTemplateEditPayload(patch));
    return toTemplate(data);
  },

  /** Draft-and-unused-only — `409 {code: 'not_deletable'}` otherwise. */
  async deleteTemplate(id) {
    await apiClient.delete(`/contracts/templates/${id}/`);
    return { success: true };
  },

  /** Validates merge fields/signature field/required values, then atomically retires the old published version. */
  async publishTemplate(id) {
    const { data } = await apiClient.post(`/contracts/templates/${id}/publish/`);
    return {
      published: data.published ? toTemplate(data.published) : null,
      retired: data.retired ? toTemplate(data.retired) : null,
    };
  },

  /** Without `confirm: true`, 400s with `{code: 'confirmation_required', affected: {upcoming_bookings}}`. */
  async retireTemplate(id, { confirm = false } = {}) {
    const { data } = await apiClient.post(`/contracts/templates/${id}/retire/`, { confirm });
    return toTemplate(data);
  },

  /** "New draft from this" / "restore as new draft" — next version, optionally into a different cell. */
  async duplicateTemplate(id, { region, stayType } = {}) {
    const body = {};
    if (region) body.region = region;
    if (stayType) body.stay_type = stayType;
    const { data } = await apiClient.post(`/contracts/templates/${id}/duplicate/`, body);
    return toTemplate(data);
  },

  /** Renders unsaved content against a sample or real booking — never persists anything. */
  async previewTemplate({ content, region, stayType, bookingId }) {
    const { data } = await apiClient.post('/contracts/templates/preview/', {
      content,
      region,
      stay_type: stayType,
      ...(bookingId ? { booking_id: bookingId } : {}),
    });
    return toTemplatePreview(data);
  },

  async getMergeFields() {
    const { data } = await apiClient.get('/contracts/merge-fields/');
    return (data?.results ?? data ?? []).map(toMergeField);
  },

  /* -------------------------------------------------------------- signing */

  async listContracts(params = {}) {
    const query = {};
    if (params.status?.length) query.status = Array.isArray(params.status) ? params.status.join(',') : params.status;
    if (params.region) query.region = params.region;
    if (params.stayType) query.stay_type = params.stayType;
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.sentFrom) query.sent_from = params.sentFrom;
    if (params.sentTo) query.sent_to = params.sentTo;
    if (params.expiringWithinDays) query.expiring_within_days = params.expiringWithinDays;
    if (params.ordering) query.ordering = params.ordering;

    const { data } = await apiClient.get('/contracts/', { params: query });
    const rows = data?.results ?? data ?? [];
    return { items: rows.map(toContractRow), total: data?.count ?? rows.length };
  },

  async getUnsentContracts(params = {}) {
    const { data } = await apiClient.get('/contracts/unsent/', { params });
    const rows = data?.results ?? data ?? [];
    return rows.map(toUnsentRow);
  },

  async getContractSummary() {
    const { data } = await apiClient.get('/contracts/summary/');
    return toContractSummary(data);
  },

  async getContractDetail(contractId) {
    const { data } = await apiClient.get(`/contracts/${contractId}/`);
    return toContractDetail(data);
  },

  async getContractEvents(contractId) {
    const { data } = await apiClient.get(`/contracts/${contractId}/events/`);
    const rows = Array.isArray(data) ? data : (data?.results ?? []);
    return rows.map(toContractEvent);
  },

  /** The agreement text and issuing state for one booking — used by the Not-sent flow before a contract id exists. */
  async contractForBooking(bookingId) {
    try {
      const { data } = await apiClient.get(`/contracts/booking/${bookingId}/text/`);
      return {
        contractId: data.contract_id,
        status: data.status,
        templateName: data.template_name,
        templateVersion: data.template_version,
        content: data.content ?? '',
      };
    } catch (error) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  /** `400 override_reason_required` if `templateId` differs from the auto-resolved one and no reason is given. `409 already_active` if one's already awaiting signature. */
  async sendContract({ bookingId, templateId, overrideReason }) {
    const { data } = await apiClient.post('/contracts/send/', {
      booking_id: bookingId,
      ...(templateId ? { template_id: templateId } : {}),
      ...(overrideReason?.trim() ? { override_reason: overrideReason.trim() } : {}),
    });
    return data;
  },

  /** Sets status to `cancelled`. `reissue: true` immediately sends a fresh contract. */
  async voidContract(contractId, { reason, reissue = false } = {}) {
    const { data } = await apiClient.post(`/contracts/${contractId}/void/`, {
      reason: reason?.trim() ?? '',
      reissue,
    });
    return {
      voided: data.voided ? toContractDetail(data.voided) : null,
      reissued: data.reissued ? toContractDetail(data.reissued) : null,
    };
  },

  /** The Remind action. 10-minute cooldown — `429 {code: 'too_soon', retry_after_seconds}`. */
  async remindContract(contractId) {
    const { data } = await apiClient.post(`/contracts/${contractId}/resend/`);
    return { nextAllowedAt: data.next_allowed_at ?? null, detail: data.detail ?? '' };
  },

  /** Short-lived, generated fresh on every call — never cache/store the returned URL. */
  async getContractDocument(contractId, { download = false } = {}) {
    const { data } = await apiClient.get(`/contracts/${contractId}/document/`, {
      params: download ? { download: 1 } : {},
    });
    return { fileUrl: data.file_url, expiresAt: data.expires_at ?? null };
  },
};

export const contractService = {
  getCoverage: () => realContracts.getCoverage(),
  getTemplatesForCell: (cell) => realContracts.getTemplatesForCell(cell),
  getTemplates: (params) => realContracts.getTemplates(params),
  createTemplateDraft: (values) => realContracts.createTemplateDraft(values),
  updateTemplateDraft: (id, patch) => realContracts.updateTemplateDraft(id, patch),
  deleteTemplate: (id) => realContracts.deleteTemplate(id),
  publishTemplate: (id) => realContracts.publishTemplate(id),
  retireTemplate: (id, options) => realContracts.retireTemplate(id, options),
  duplicateTemplate: (id, target) => realContracts.duplicateTemplate(id, target),
  previewTemplate: (values) => realContracts.previewTemplate(values),
  getMergeFields: () => realContracts.getMergeFields(),

  listContracts: (params) => realContracts.listContracts(params),
  getUnsentContracts: (params) => realContracts.getUnsentContracts(params),
  getContractSummary: () => realContracts.getContractSummary(),
  getContractDetail: (id) => realContracts.getContractDetail(id),
  getContractEvents: (id) => realContracts.getContractEvents(id),
  getContractForBooking: (bookingId) => realContracts.contractForBooking(bookingId),
  sendContract: (payload) => realContracts.sendContract(payload),
  voidContract: (id, options) => realContracts.voidContract(id, options),
  remindContract: (id) => realContracts.remindContract(id),
  getContractDocument: (id, options) => realContracts.getContractDocument(id, options),
};
