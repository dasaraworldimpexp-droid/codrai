import { api } from "../../services/api";

export const providerApi = {
  list() {
    return api.get("/providers").then((response) => response.data);
  },

  validate() {
    const workspaceId = localStorage.getItem("codrai_workspace_id");
    return api.post("/providers/validate", { workspaceId }).then((response) => response.data);
  },

  settings() {
    return api.get("/providers/settings", {
      params: { workspaceId: localStorage.getItem("codrai_workspace_id") },
    }).then((response) => response.data);
  },

  save(providerName, apiKey) {
    return api.put(`/providers/settings/${providerName}`, {
      apiKey,
      workspaceId: localStorage.getItem("codrai_workspace_id"),
    }).then((response) => response.data);
  },

  remove(providerName) {
    return api.delete(`/providers/settings/${providerName}`, {
      data: { workspaceId: localStorage.getItem("codrai_workspace_id") },
    }).then((response) => response.data);
  },
};
