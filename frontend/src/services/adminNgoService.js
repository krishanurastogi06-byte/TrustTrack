import api from "../lib/axios";

function normalizeNgoList(payload = {}) {
  const items = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  return {
    items,
    total: Number(payload.total ?? payload.meta?.total ?? items.length ?? 0),
    page: Number(payload.page ?? payload.meta?.page ?? 1),
    perPage: Number(payload.perPage ?? payload.meta?.perPage ?? items.length ?? 0),
    success: payload.success,
    message: payload.message || "",
  };
}

function normalizeSingleNgo(payload = {}) {
  return {
    ngo: payload.ngo || payload.data || null,
    success: payload.success,
    message: payload.message || "",
  };
}

function normalizeNgoCampaigns(payload = {}) {
  const items = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  return {
    items,
    ngo: payload.ngo || payload.extra?.ngo || null,
    success: payload.success,
    message: payload.message || "",
  };
}

export async function fetchAdminNgos(params = {}) {
  const safeParams = {
    ...params,
    page: Math.max(1, Number(params?.page || 1)),
    perPage: Math.min(100, Math.max(1, Number(params?.perPage || 20))),
  };

  const res = await api.get("/admin/ngos", { params: safeParams });
  return normalizeNgoList(res.data || {});
}

export async function verifyAdminNgo(ngoId) {
  if (!ngoId) throw new Error("ngoId is required");
  const res = await api.patch(`/admin/ngos/${ngoId}/verify`);
  return normalizeSingleNgo(res.data || {});
}

export async function rejectAdminNgo(ngoId) {
  if (!ngoId) throw new Error("ngoId is required");
  const res = await api.patch(`/admin/ngos/${ngoId}/reject`);
  return normalizeSingleNgo(res.data || {});
}

export async function fetchVerifiedNgos(params = {}) {
  const safeParams = {
    ...params,
    page: Math.max(1, Number(params?.page || 1)),
    perPage: Math.min(100, Math.max(1, Number(params?.perPage || 20))),
  };

  const res = await api.get('/admin/ngos/verified', { params: safeParams });
  return normalizeNgoList(res.data || {});
}

export async function deleteAdminNgo(ngoId) {
  if (!ngoId) throw new Error('ngoId is required');
  const res = await api.delete(`/admin/ngos/${ngoId}`);
  return {
    result: res?.data?.result || res?.data?.data || null,
    success: res?.data?.success,
    message: res?.data?.message || 'NGO removed',
  };
}

export async function fetchAdminNgoCampaigns(ngoId) {
  if (!ngoId) throw new Error('ngoId is required');
  const res = await api.get(`/admin/ngos/${ngoId}/campaigns`);
  return normalizeNgoCampaigns(res.data || {});
}

export default {
  fetchAdminNgos,
  verifyAdminNgo,
  rejectAdminNgo,
  fetchVerifiedNgos,
  deleteAdminNgo,
  fetchAdminNgoCampaigns,
};
