import { api } from "../../services/api";

export const runtimeApi = {
  execute(payload) {
    return api.post("/runtime/execute", payload).then((response) => response.data);
  },

  startWorkflow(payload) {
    return api.post("/workflows/runs", payload).then((response) => response.data);
  },

  startAgentRun(payload) {
    return api.post("/agents/runs", payload).then((response) => response.data);
  },

  enterpriseCompletion(params = {}) {
    return api.get("/runtime/enterprise-completion", { params }).then((response) => response.data);
  },

  cpu(params = {}) {
    return api.get("/runtime/cpu", { params }).then((response) => response.data);
  },

  diagnostics(params = {}) {
    return api.get("/runtime/diagnostics", { params }).then((response) => response.data);
  },

  queues(params = {}) {
    return api.get("/runtime/queues", { params }).then((response) => response.data);
  },

  workers(params = {}) {
    return api.get("/runtime/workers", { params }).then((response) => response.data);
  },

  whisperDiagnostics(params = {}) {
    return api.get("/multimodal/audio/whisper/diagnostics", { params }).then((response) => response.data);
  },
};
