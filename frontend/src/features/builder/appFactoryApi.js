import { api } from "../../services/api";

export const appFactoryApi = {
  list({ workspaceId }) {
    return api.get("/app-factory/runs", { params: { workspaceId } }).then((response) => response.data);
  },

  generate(payload) {
    return api.post("/app-factory/runs", payload).then((response) => response.data);
  },
};
