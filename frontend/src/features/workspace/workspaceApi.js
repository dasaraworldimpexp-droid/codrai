import { api } from "../../services/api";

export const workspaceApi = {
  getSession(params) {
    return api.get("/workspace/session", { params }).then((response) => response.data);
  },

  patchSession(payload) {
    return api.patch("/workspace/session", payload).then((response) => response.data);
  },
};
