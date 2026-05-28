import { api } from "../../services/api";

export const orchestratorApi = {
  listRuns({ workspaceId }) {
    return api.get("/orchestrator/runs", { params: { workspaceId } }).then((response) => response.data);
  },

  getRun({ workspaceId, runId }) {
    return api.get(`/orchestrator/runs/${runId}`, { params: { workspaceId } }).then((response) => response.data);
  },

  startRun(payload) {
    return api.post("/orchestrator/runs", payload).then((response) => response.data);
  },

  resumeRun({ workspaceId, userId, runId }) {
    return api.post(`/orchestrator/runs/${runId}/resume`, { workspaceId, userId }).then((response) => response.data);
  },

  cancelRun({ workspaceId, userId, runId }) {
    return api.post(`/orchestrator/runs/${runId}/cancel`, { workspaceId, userId }).then((response) => response.data);
  },
};
