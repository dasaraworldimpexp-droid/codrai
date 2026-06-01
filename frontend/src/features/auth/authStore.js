import { create } from "zustand";
import { authApi } from "./authApi.js";

function saveSession(result) {
  if (result.token) localStorage.setItem("codrai_token", result.token);
  if (result.refreshToken) localStorage.setItem("codrai_refresh_token", result.refreshToken);
  if (result.workspaceId) localStorage.setItem("codrai_workspace_id", result.workspaceId);
  if (result.user?.id) localStorage.setItem("codrai_user_id", result.user.id);
  if (result.user) localStorage.setItem("codrai_user", JSON.stringify(result.user));
}

function clearSession() {
  localStorage.removeItem("codrai_token");
  localStorage.removeItem("codrai_refresh_token");
  localStorage.removeItem("codrai_workspace_id");
  localStorage.removeItem("codrai_user_id");
  localStorage.removeItem("codrai_user");
}

function broadcastAuth(event) {
  localStorage.setItem("codrai_auth_event", JSON.stringify({ event, at: Date.now() }));
}

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem("codrai_token"),
  user: JSON.parse(localStorage.getItem("codrai_user") || "null"),
  workspaceId: localStorage.getItem("codrai_workspace_id"),
  loading: false,
  bootstrapped: false,
  error: "",

  async bootstrap() {
    if (!localStorage.getItem("codrai_token") && !localStorage.getItem("codrai_refresh_token")) {
      set({ bootstrapped: true });
      return null;
    }
    set({ loading: true, error: "" });
    try {
      const result = await authApi.me();
      const user = result.user;
      if (user) {
        localStorage.setItem("codrai_user", JSON.stringify(user));
        if (user.workspaceId) localStorage.setItem("codrai_workspace_id", user.workspaceId);
      }
      set({ user, workspaceId: user?.workspaceId || get().workspaceId, token: localStorage.getItem("codrai_token"), loading: false, bootstrapped: true });
      return user;
    } catch (error) {
      try {
        const refresh = await authApi.refresh({ refreshToken: localStorage.getItem("codrai_refresh_token") });
        saveSession(refresh);
        const restored = await authApi.me();
        const user = restored.user || refresh.user;
        if (user) {
          localStorage.setItem("codrai_user", JSON.stringify(user));
          if (user.workspaceId) localStorage.setItem("codrai_workspace_id", user.workspaceId);
        }
        set({ token: refresh.token, user, workspaceId: user?.workspaceId || refresh.workspaceId || get().workspaceId, loading: false, bootstrapped: true, error: "" });
        return user;
      } catch {
        clearSession();
        set({ token: null, user: null, workspaceId: null, loading: false, bootstrapped: true, error: error.response?.data?.message || error.message });
        return null;
      }
    }
  },

  async login(payload) {
    set({ loading: true, error: "" });
    try {
      const result = await authApi.login(payload);
      saveSession(result);
      broadcastAuth("login");
      set({ token: result.token, user: result.user, workspaceId: result.workspaceId, loading: false });
      return result;
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || error.message });
      throw error;
    }
  },

  async signup(payload) {
    set({ loading: true, error: "" });
    try {
      const result = await authApi.signup(payload);
      saveSession(result);
      broadcastAuth("signup");
      set({ token: result.token, user: result.user, workspaceId: result.workspaceId, loading: false });
      return result;
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || error.message });
      throw error;
    }
  },

  async googleLogin(payload) {
    set({ loading: true, error: "" });
    try {
      const result = await authApi.googleLogin(payload);
      saveSession(result);
      broadcastAuth("google_login");
      set({ token: result.token, user: result.user, workspaceId: result.workspaceId, loading: false });
      return result;
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || error.message });
      throw error;
    }
  },

  async logout() {
    try {
      if (localStorage.getItem("codrai_token")) {
        await authApi.logout({ refreshToken: localStorage.getItem("codrai_refresh_token") });
      }
    } catch {
      // Local logout should still complete when the server is unavailable.
    }
    clearSession();
    broadcastAuth("logout");
    set({ token: null, user: null, workspaceId: null, error: "" });
  },

  syncFromStorage() {
    set({
      token: localStorage.getItem("codrai_token"),
      user: JSON.parse(localStorage.getItem("codrai_user") || "null"),
      workspaceId: localStorage.getItem("codrai_workspace_id"),
    });
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "codrai_auth_event") {
      useAuthStore.getState().syncFromStorage();
    }
  });
}
