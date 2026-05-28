import { api } from "../../services/api";

function workspaceId() {
  return localStorage.getItem("codrai_workspace_id");
}

export const enterpriseCloudApi = {
  overview() {
    return api.get("/enterprise/cloud/overview", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  billing() {
    return api.get("/enterprise/cloud/billing", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  billingStatus() {
    return api.get("/billing/status", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  stripeCheckout(plan) {
    return api.post("/billing/stripe/checkout", { workspaceId: workspaceId(), plan }).then((response) => response.data);
  },
  razorpayOrder({ plan, credits } = {}) {
    return api.post("/billing/razorpay/orders", { workspaceId: workspaceId(), plan, credits }).then((response) => response.data);
  },
  updateSeats(seats) {
    return api.post("/billing/seats", { workspaceId: workspaceId(), seats }).then((response) => response.data);
  },
  generateUsageInvoice() {
    return api.post("/billing/usage-invoices", { workspaceId: workspaceId() }).then((response) => response.data);
  },
  setPlan(plan) {
    return api.post("/enterprise/cloud/billing/plan", { workspaceId: workspaceId(), plan }).then((response) => response.data);
  },
  addCredits(credits) {
    return api.post("/enterprise/cloud/billing/credits", { workspaceId: workspaceId(), credits }).then((response) => response.data);
  },
  organization() {
    return api.get("/enterprise/cloud/organization", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  createOrganization(name) {
    return api.post("/enterprise/cloud/organization", { workspaceId: workspaceId(), name }).then((response) => response.data);
  },
  gatewayPolicy() {
    return api.get("/enterprise/cloud/gateway-policy", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  updateGatewayPolicy(policy) {
    return api.put("/enterprise/cloud/gateway-policy", { workspaceId: workspaceId(), ...policy }).then((response) => response.data);
  },
  models() {
    return api.get("/enterprise/cloud/models", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  observability() {
    return api.get("/enterprise/cloud/observability", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  adminDiagnostics() {
    return api.get("/enterprise/cloud/admin/diagnostics", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  globalAiOs() {
    return api.get("/enterprise/cloud/global-ai-os", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  aiOrchestration() {
    return api.get("/enterprise/cloud/ai-orchestration", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  agentPlatform() {
    return api.get("/enterprise/cloud/agents", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  appBuilderPlatform() {
    return api.get("/enterprise/cloud/app-builder", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  deploymentReadiness() {
    return api.get("/enterprise/cloud/deployment-readiness", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  marketplaceEcosystem() {
    return api.get("/enterprise/cloud/marketplace-ecosystem", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  securityHardening() {
    return api.get("/enterprise/cloud/security-hardening", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  controlCenter() {
    return api.get("/enterprise/cloud/control-center", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  operatingSystem() {
    return api.get("/enterprise/cloud/operating-system", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  autonomousOs() {
    return api.get("/enterprise/cloud/autonomous-os", { params: { workspaceId: workspaceId() } }).then((response) => response.data);
  },
  runProviderBenchmarks() {
    return api.post("/enterprise/cloud/provider-benchmarks/run", { workspaceId: workspaceId() }).then((response) => response.data);
  },
  recommendRoute(payload = {}) {
    return api.post("/enterprise/cloud/router/recommend", { workspaceId: workspaceId(), ...payload }).then((response) => response.data);
  },
};
