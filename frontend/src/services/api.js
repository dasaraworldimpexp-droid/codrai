import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("codrai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes("/auth/")) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem("codrai_refresh_token");
        if (!refreshToken) {
          const cookieRefresh = await api.post("/auth/refresh", {});
          if (cookieRefresh.data?.token) {
            localStorage.setItem("codrai_token", cookieRefresh.data.token);
            if (cookieRefresh.data.refreshToken) localStorage.setItem("codrai_refresh_token", cookieRefresh.data.refreshToken);
            original.headers.Authorization = `Bearer ${cookieRefresh.data.token}`;
            return api(original);
          }
          throw new Error("Refresh token is not available.");
        }
        const refresh = await api.post("/auth/refresh", { refreshToken });
        if (refresh.data?.token) {
          localStorage.setItem("codrai_token", refresh.data.token);
          if (refresh.data.refreshToken) localStorage.setItem("codrai_refresh_token", refresh.data.refreshToken);
          original.headers.Authorization = `Bearer ${refresh.data.token}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem("codrai_token");
      }
    }
    throw error;
  }
);
