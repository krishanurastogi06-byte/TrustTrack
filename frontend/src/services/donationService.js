import api from "../lib/axios";

export async function fetchDonations(params = {}) {
  const res = await api.get("/donations", { params });
  return res.data;
}

export async function fetchDonationById(id) {
  const res = await api.get(`/donations/${id}`);
  return res.data;
}

export async function createDonation(payload) {
  const res = await api.post("/donations", payload);
  return res.data;
}

export async function confirmDonation(payload) {
  const res = await api.post("/donations/confirm", payload);
  return res.data;
}

export default {
  fetchDonations,
  fetchDonationById,
  createDonation,
  confirmDonation,
};
