import api from "../lib/axios";

export async function getDonorWallet() {
  const res = await api.get("/donor/wallet");
  return res.data;
}

export async function getDonorWalletBalance() {
  const res = await api.get("/donor/wallet/balance");
  return res.data;
}

export default {
  getDonorWallet,
  getDonorWalletBalance,
};
