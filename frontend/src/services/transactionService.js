import api from "../lib/axios";

export async function saveTransaction(payload) {
  // payload: { txHash, from, to, amount, status, network, campaignId, blockNumber }
  const res = await api.post("/transactions", payload);
  return res.data;
}

export async function updateTransaction(txHash, payload) {
  // Backend should support patching by txHash or id; if not, implement as needed
  const res = await api.patch(`/transactions/${txHash}`, payload);
  return res.data;
}

export default {
  saveTransaction,
  updateTransaction,
};
