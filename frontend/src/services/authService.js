import api from "../lib/axios";

function normalizeAuthPayload(payload) {
  const root = payload || {};
  const data = root.data || {};

  return {
    user: root.user || data.user || null,
    accessToken: root.accessToken || data.accessToken || null,
    refreshToken: root.refreshToken || data.refreshToken || null,
    message: root.message || "",
  };
}

function normalizeMePayload(payload) {
  const root = payload || {};
  return {
    user: root.user || root.data || null,
    message: root.message || "",
  };
}

async function postAuth(path, payload) {
  const res = await api.post(`/auth/${path}`, payload);
  return res.data || {};
}

export async function login(payload) {
  const raw = await postAuth("login", payload);
  return normalizeAuthPayload(raw);
}

export async function register(payload) {
  const raw = await postAuth("register", payload);
  return normalizeAuthPayload(raw);
}

export async function refresh(payload) {
  const raw = await postAuth("refresh", payload);
  return normalizeAuthPayload(raw);
}

export async function me() {
  const res = await api.get("/auth/me");
  return normalizeMePayload(res.data);
}

export default {
  login,
  register,
  refresh,
  me,
};
