import { api } from "../../services/api";

export const autonomousCycleApi = {
  list({ workspaceId }) {
    return api.get("/autonomous-cycles", { params: { workspaceId } }).then((response) => response.data);
  },

  start(payload) {
    return api.post("/autonomous-cycles", payload).then((response) => response.data);
  },
};
