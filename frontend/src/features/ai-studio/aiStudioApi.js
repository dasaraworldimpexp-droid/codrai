import { api } from "../../services/api";

function workspaceId() {
  return localStorage.getItem("codrai_workspace_id");
}

export const aiStudioApi = {
  readiness() {
    return api.get("/ai-studio/readiness", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  templates() {
    return api.get("/ai-studio/templates", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  jobs() {
    return api.get("/ai-studio/media/jobs", { params: { workspaceId: workspaceId(), limit: 50 } }).then((response) => response.data);
  },
  createJob(payload) {
    return api.post("/ai-studio/media/jobs", { workspaceId: workspaceId(), ...payload }).then((response) => response.data);
  },
  runtimeDiagnostics() {
    return api.get("/runtime/diagnostics", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  operatorConsole() {
    return api.get("/runtime/operator-console", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  recoverStaleExecutions(dryRun = false) {
    return api.post("/runtime/recover/stale-executions", { workspaceId: workspaceId(), dryRun }).then((response) => response.data);
  },
  queues() {
    return api.get("/runtime/queues", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  workers() {
    return api.get("/runtime/workers", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  gpuTelemetry() {
    return api.get("/runtime/gpu", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  cpuTelemetry() {
    return api.get("/runtime/cpu", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  runtimeCluster() {
    return api.get("/runtime/cluster", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  autonomousOs() {
    return api.get("/enterprise/cloud/autonomous-os", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  searchMemory(query, limit = 8) {
    return api.get("/memory/search", { params: { workspaceId: workspaceId(), query, limit } }).then((response) => response.data);
  },
  appendMemory(content, metadata = {}) {
    return api.post("/memory", { workspaceId: workspaceId(), content, metadata }).then((response) => response.data);
  },
  memoryGraph() {
    return api.get("/memory/graph", { params: { workspaceId: workspaceId(), limit: 40 } }).then((response) => response.data);
  },
  memorySummary() {
    return api.get("/memory/summary", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  indexMemory(limit = 50) {
    return api.post("/memory/index", { workspaceId: workspaceId(), limit }).then((response) => response.data);
  },
  multimodalStatus() {
    return api.get("/multimodal/status", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  desktopStatus() {
    return api.get("/multimodal/desktop/status", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  transcribeAudio(formData) {
    formData.set("workspaceId", workspaceId() || "local-workspace");
    return api.post("/multimodal/audio/transcribe", formData).then((response) => response.data);
  },
  queueTranscription(formData) {
    formData.set("workspaceId", workspaceId() || "local-workspace");
    return api.post("/multimodal/audio/transcribe/queue", formData).then((response) => response.data);
  },
  transcriptionHistory() {
    return api.get("/multimodal/audio/transcripts", { params: { workspaceId: workspaceId(), limit: 10 } }).then((response) => response.data);
  },
  whisperDiagnostics() {
    return api.get("/multimodal/audio/whisper/diagnostics", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  analyzeImage(formData) {
    formData.set("workspaceId", workspaceId() || "local-workspace");
    return api.post("/multimodal/vision/analyze", formData).then((response) => response.data);
  },
  desktopAction(action) {
    return api.post("/multimodal/desktop/actions", { workspaceId: workspaceId(), action }).then((response) => response.data);
  },
  deploymentReplay() {
    return api.get("/deployment/replay", { params: { workspaceId: workspaceId(), limit: 20 } }).then((response) => response.data);
  },
  deploymentTemplates() {
    return api.get("/deployment/templates", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  openSourceRuntime() {
    return api.get("/open-source/status", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  pullLocalModel(model) {
    return api.post("/open-source/models/pull", { workspaceId: workspaceId(), model }).then((response) => response.data);
  },
  agentCatalog() {
    return api.get("/agents/catalog", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  agentStatus() {
    return api.get("/agents/status", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  startAgentRun(payload) {
    return api.post("/agents/runs", { workspaceId: workspaceId(), ...payload }).then((response) => response.data);
  },
  agentRuns() {
    return api.get("/agents/runs", { params: { workspaceId: workspaceId(), limit: 20 } }).then((response) => response.data);
  },
  agentMessages(runId, limit = 40) {
    return api.get(`/agents/runs/${runId}/messages`, { params: { workspaceId: workspaceId(), limit } }).then((response) => response.data);
  },
  agentDag(runId) {
    return api.get(`/agents/runs/${runId}/dag`, { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  agentReplay(runId) {
    return api.get(`/agents/runs/${runId}/replay`, { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  browserSessions() {
    return api.get("/computer-use/sessions", { params: { workspaceId: workspaceId(), limit: 10 } }).then((response) => response.data);
  },
  browserReplay(sessionId) {
    return api.get(`/computer-use/sessions/${sessionId}/replay`, { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  runBrowserSession(startUrl) {
    return api.post("/computer-use/sessions", { workspaceId: workspaceId(), startUrl, steps: [{ action: "extract" }] }).then((response) => response.data);
  },
};
