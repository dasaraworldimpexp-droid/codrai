import { api } from "../../services/api";

export const workflowApi = {
  list({ workspaceId }) {
    return api.get("/workflows", { params: { workspaceId } }).then((response) => response.data);
  },

  save(payload) {
    return api.post("/workflows", payload).then((response) => response.data);
  },

  runSaved({ workspaceId, userId, workflowId }) {
    return api.post(`/workflows/${workflowId}/runs`, { workspaceId, userId }).then((response) => response.data);
  },

  getRun(runId) {
    return api.get(`/workflows/runs/${runId}`).then((response) => response.data);
  },
};
