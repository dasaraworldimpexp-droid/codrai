import { api } from "../../services/api";

export const selfImprovementApi = {
  analyze(payload) {
    return api.post("/self-improvement/runs", payload).then((response) => response.data);
  },

  listRuns({ workspaceId }) {
    return api.get("/self-improvement/runs", { params: { workspaceId } }).then((response) => response.data);
  },

  listProposals({ workspaceId }) {
    return api.get("/self-improvement/proposals", { params: { workspaceId } }).then((response) => response.data);
  },
};
