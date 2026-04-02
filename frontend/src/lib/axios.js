import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").trim();
if (!API_BASE) {
  throw new Error("[config] Missing required frontend environment variable: VITE_API_BASE_URL");
}

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

let isRefreshing = false;
let pendingRequests = [];

function resolvePendingRequests(error, token = null) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(token);
  });
  pendingRequests = [];
}

// Attach auth token if present
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});

// Basic response/error handling
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Normalize axios error shape
    const err = error;
    if (err.response) {
      const originalRequest = err.config || {};
      const status = err.response.status;
      const message =
        err.response.data?.error ||
        err.response.data?.error?.message ||
        err.response.data?.message ||
        err.response.statusText ||
        "Request failed";

      const isRefreshRequest = originalRequest.url?.includes("/refresh");
      const hasToken = Boolean(useAuthStore.getState().accessToken);
      const refreshToken = useAuthStore.getState().refreshToken;

      if (status === 401 && hasToken && refreshToken && !originalRequest._retry && !isRefreshRequest) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingRequests.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
              return api(originalRequest);
            })
            .catch((refreshError) => Promise.reject(refreshError));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          let refreshResponse;
          refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken }, {
            headers: { "Content-Type": "application/json" },
            timeout: 15000,
          });

          const refreshData = refreshResponse?.data || {};
          const refreshed = {
            accessToken: refreshData.accessToken || refreshData.data?.accessToken || null,
            refreshToken: refreshData.refreshToken || refreshData.data?.refreshToken || null,
          };
          if (!refreshed?.accessToken) {
            throw new Error("Session expired");
          }

          useAuthStore.getState().setTokens({
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken || refreshToken,
          });

          resolvePendingRequests(null, refreshed.accessToken);

          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${refreshed.accessToken}`,
          };
          return api(originalRequest);
        } catch (refreshErr) {
          resolvePendingRequests(refreshErr, null);
          useAuthStore.getState().logout();
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      const normalized = new Error(
        message
      );
      normalized.status = status;
      normalized.data = err.response.data;

      if (status === 401 && isRefreshRequest) {
        const { logout } = useAuthStore.getState();
        logout();
      } else if (status === 401 && !hasToken) {
        // Keep UX predictable: clear stale auth on unauthorized API access.
        const { logout } = useAuthStore.getState();
        logout();
      }

      return Promise.reject(normalized);
    }
    return Promise.reject(err);
  }
);

export default api;
