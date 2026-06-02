import api from "../lib/axios";

function normalizeListPayload(payload = {}) {
  const items = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  return {
    items,
    data: items,
    total: Number(payload.total ?? payload.meta?.total ?? items.length ?? 0),
    page: Number(payload.page ?? payload.meta?.page ?? 1),
    perPage: Number(payload.perPage ?? payload.meta?.perPage ?? items.length ?? 0),
    success: payload.success,
    message: payload.message || "",
  };
}

function normalizeSinglePayload(payload = {}, key) {
  const base = payload[key] || payload.data || null;
  const milestones = Array.isArray(payload.milestones)
    ? payload.milestones
    : Array.isArray(base?.milestones)
      ? base.milestones
      : [];
  const contractAddress = payload.contractAddress || base?.contractAddress || null;

  return {
    [key]: base,
    milestones,
    contractAddress,
    success: payload.success,
    message: payload.message || "",
  };
}

export async function fetchCampaigns(params = {}) {
  const safeParams = {
    ...params,
    page: Math.max(1, Number(params?.page || 1)),
    perPage: Math.min(100, Math.max(1, Number(params?.perPage || 20))),
  };

  const res = await api.get("/campaigns", { params: safeParams });
  return normalizeListPayload(res.data || {});
}

export async function fetchAdminCampaigns(params = {}) {
  const safeParams = {
    ...params,
    page: Math.max(1, Number(params?.page || 1)),
    perPage: Math.min(100, Math.max(1, Number(params?.perPage || 20))),
  };

  const res = await api.get("/admin/campaigns", { params: safeParams });
  return normalizeListPayload(res.data || {});
}

export async function fetchNgoCampaigns(params = {}) {
  const res = await api.get("/campaigns", { params });
  return normalizeListPayload(res.data || {});
}

export async function fetchCampaignById(id) {
  if (!id) throw new Error("campaign id is required");
  const res = await api.get(`/campaigns/${id}`);
  return normalizeSinglePayload(res.data || {}, "campaign");
}

export async function createCampaign(payload) {
  const res = await api.post("/campaigns", payload);
  return normalizeSinglePayload(res.data || {}, "campaign");
}

export async function updateCampaign(id, payload) {
  const res = await api.patch(`/campaigns/${id}`, payload);
  return normalizeSinglePayload(res.data || {}, "campaign");
}

export async function deleteCampaign(id) {
  const res = await api.delete(`/campaigns/${id}`);
  return res.data;
}

export async function verifyCampaign(id) {
  if (!id) throw new Error("campaign id is required");
  const res = await api.patch(`/admin/campaigns/${id}/verify`);
  return normalizeSinglePayload(res.data || {}, "campaign");
}

export async function rejectCampaign(id) {
  if (!id) throw new Error("campaign id is required");
  const res = await api.patch(`/admin/campaigns/${id}/reject`);
  return normalizeSinglePayload(res.data || {}, "campaign");
}

export async function fetchCampaignMilestones(campaignId) {
  if (!campaignId) throw new Error("campaignId is required");
  const res = await api.get(`/campaigns/${campaignId}/milestones`);
  return normalizeListPayload(res.data || {});
}

export async function createMilestone(campaignId, payload) {
  if (!campaignId) throw new Error("campaignId is required");
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid milestone payload");
  }

  const title = String(payload.title || "").trim();
  const amount = Number(payload.amountETH);
  const order = Number(payload.order || 0);

  if (!title) throw new Error("Milestone title is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Milestone amountETH must be greater than 0");
  if (!Number.isInteger(order) || order <= 0) throw new Error("Milestone order must be a positive integer");

  const requestPayload = {
    title,
    amountETH: amount,
    order,
  };

  const res = await api.post(`/campaigns/${campaignId}/milestones`, requestPayload);
  return normalizeSinglePayload(res.data || {}, "milestone");
}

export default {
  fetchCampaigns,
  fetchAdminCampaigns,
  fetchCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  verifyCampaign,
  rejectCampaign,
  fetchCampaignMilestones,
  createMilestone,
};
