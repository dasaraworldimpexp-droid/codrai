import { api } from "../../services/api";

export const marketplaceApi = {
  extensions(params) {
    return api.get("/marketplace/extensions", { params }).then((response) => response.data);
  },

  installations(params) {
    return api.get("/marketplace/installations", { params }).then((response) => response.data);
  },

  install(payload) {
    return api.post("/marketplace/extensions/install", payload).then((response) => response.data);
  },

  review(extensionId, payload) {
    return api.post(`/marketplace/extensions/${extensionId}/reviews`, payload).then((response) => response.data);
  },
};
