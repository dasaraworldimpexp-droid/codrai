import { api } from "../../services/api";

export const toolApi = {
  listTools() {
    return api.get("/tools").then((response) => response.data);
  },

  execute(payload) {
    return api.post("/tools/executions", payload).then((response) => response.data);
  },

  cancel(executionId) {
    return api.post(`/tools/executions/${executionId}/cancel`).then((response) => response.data);
  },
};
