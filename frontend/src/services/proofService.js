import api from "../lib/axios";

export async function uploadProofFile(file) {
  if (!file) throw new Error("file is required");
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function createProof(milestoneId, payload) {
  if (!milestoneId) throw new Error("milestoneId is required");
  const res = await api.post(`/milestones/${milestoneId}/proofs`, payload);
  return res.data;
}

export async function fetchAdminProofs(params = {}) {
  const res = await api.get("/admin/proofs", { params });
  return res.data;
}

export async function fetchMyProofs(params = {}) {
  const res = await api.get("/proofs/me", { params });
  return res.data;
}

export async function verifyProof(proofId, payload = {}) {
  const res = await api.post(`/admin/proofs/${proofId}/verify`, payload);
  return res.data;
}

export async function rejectProof(proofId, payload = {}) {
  const res = await api.post(`/admin/proofs/${proofId}/reject`, payload);
  return res.data;
}

export async function deleteMilestone(milestoneId) {
  if (!milestoneId) throw new Error("milestoneId is required");
  const res = await api.delete(`/milestones/${milestoneId}`);
  return res.data;
}

export async function releaseMilestoneFunds(milestoneId) {
  if (!milestoneId) throw new Error("milestoneId is required");
  const res = await api.post(`/admin/milestones/${milestoneId}/release`);
  return res.data;
}

export default {
  uploadProofFile,
  createProof,
  fetchAdminProofs,
  fetchMyProofs,
  verifyProof,
  rejectProof,
  deleteMilestone,
  releaseMilestoneFunds,
};
