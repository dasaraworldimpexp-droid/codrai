import { api } from "../../services/api";

export const authApi = {
  signup(payload) {
    return api.post("/auth/signup", payload).then((response) => response.data);
  },

  login(payload) {
    return api.post("/auth/login", payload).then((response) => response.data);
  },

  googleConfig() {
    return api.get("/auth/google/config").then((response) => response.data);
  },

  googleLogin(payload) {
    return api.post("/auth/google", payload).then((response) => response.data);
  },

  googleSettings() {
    return api.get("/auth/google/settings").then((response) => response.data);
  },

  saveGoogleSettings(payload) {
    return api.put("/auth/google/settings", payload).then((response) => response.data);
  },

  testGoogleSettings() {
    return api.post("/auth/google/test", {}).then((response) => response.data);
  },

  refresh(payload) {
    return api.post("/auth/refresh", payload).then((response) => response.data);
  },

  logout(payload) {
    return api.post("/auth/logout", payload).then((response) => response.data);
  },

  me() {
    return api.get("/auth/me").then((response) => response.data);
  },

  forgotPassword(payload) {
    return api.post("/auth/forgot-password", payload).then((response) => response.data);
  },

  resetPassword(payload) {
    return api.post("/auth/reset-password", payload).then((response) => response.data);
  },

  verifyEmail(payload) {
    return api.post("/auth/verify-email", payload).then((response) => response.data);
  },
};
