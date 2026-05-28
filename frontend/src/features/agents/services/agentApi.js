import { api } from "../../../services/api";

export const agentApi = {
  catalog(params) {
    return api.get("/agents/catalog", { params }).then((response) => response.data);
  },

  status(params) {
    return api.get("/agents/status", { params }).then((response) => response.data);
  },

  startAutonomousGoal(payload) {
    return api.post("/autonomy/goals", payload).then((response) => response.data);
  },

  startAgentRun(payload) {
    return api.post("/agents/runs", payload).then((response) => response.data);
  },

  listAgentRuns(params) {
    return api.get("/agents/runs", { params }).then((response) => response.data);
  },
};
