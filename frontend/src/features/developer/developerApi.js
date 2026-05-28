import { api } from "../../services/api";

function workspaceId() {
  return localStorage.getItem("codrai_workspace_id");
}

export const developerApi = {
  keys() {
    return api.get("/developer/api-keys", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  createKey(payload) {
    return api.post("/developer/api-keys", { ...payload, workspaceId: workspaceId() }).then((response) => response.data);
  },
  rotateKey(keyId) {
    return api.post(`/developer/api-keys/${keyId}/rotate`, { workspaceId: workspaceId() }).then((response) => response.data);
  },
  revokeKey(keyId) {
    return api.delete(`/developer/api-keys/${keyId}`, { data: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  usage() {
    return api.get("/developer/usage", { params: { workspaceId: workspaceId(), limit: 100 } }).then((response) => response.data);
  },
  logs() {
    return api.get("/developer/logs", { params: { workspaceId: workspaceId(), limit: 100 } }).then((response) => response.data);
  },
  docs() {
    return api.get("/developer/docs", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
};
