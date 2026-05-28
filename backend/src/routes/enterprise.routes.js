import { Router } from "express";
import { executeEnterpriseAction, listEnterpriseModules } from "../controllers/enterprise.controller.js";
import {
  enterpriseAddCredits,
  enterpriseAdminDiagnostics,
  enterpriseAgentPlatform,
  enterpriseAiOrchestration,
  enterpriseAppBuilderPlatform,
  enterpriseAutonomousOs,
  enterpriseBilling,
  enterpriseCloudOverview,
  enterpriseCreateOrganization,
  enterpriseDeploymentReadiness,
  enterpriseGatewayPolicy,
  enterpriseGlobalControlCenter,
  enterpriseGlobalAiOs,
  enterpriseMarketplaceEcosystem,
  enterpriseModelMarketplace,
  enterpriseObservability,
  enterpriseOperatingSystem,
  enterpriseOrganization,
  enterpriseRecommendRoute,
  enterpriseRunProviderBenchmarks,
  enterpriseSecurityHardening,
  enterpriseSetPlan,
  enterpriseUpdateGatewayPolicy,
} from "../controllers/enterprise-cloud.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/modules", listEnterpriseModules);
router.post("/actions", executeEnterpriseAction);
router.get("/cloud/overview", requireAuth, enterpriseCloudOverview);
router.get("/cloud/billing", requireAuth, enterpriseBilling);
router.post("/cloud/billing/plan", requireAuth, enterpriseSetPlan);
router.post("/cloud/billing/credits", requireAuth, enterpriseAddCredits);
router.get("/cloud/organization", requireAuth, enterpriseOrganization);
router.post("/cloud/organization", requireAuth, enterpriseCreateOrganization);
router.get("/cloud/gateway-policy", requireAuth, enterpriseGatewayPolicy);
router.put("/cloud/gateway-policy", requireAuth, enterpriseUpdateGatewayPolicy);
router.get("/cloud/models", requireAuth, enterpriseModelMarketplace);
router.get("/cloud/observability", requireAuth, enterpriseObservability);
router.get("/cloud/admin/diagnostics", requireAuth, enterpriseAdminDiagnostics);
router.get("/cloud/global-ai-os", requireAuth, enterpriseGlobalAiOs);
router.get("/cloud/ai-orchestration", requireAuth, enterpriseAiOrchestration);
router.get("/cloud/agents", requireAuth, enterpriseAgentPlatform);
router.get("/cloud/app-builder", requireAuth, enterpriseAppBuilderPlatform);
router.get("/cloud/deployment-readiness", requireAuth, enterpriseDeploymentReadiness);
router.get("/cloud/marketplace-ecosystem", requireAuth, enterpriseMarketplaceEcosystem);
router.get("/cloud/security-hardening", requireAuth, enterpriseSecurityHardening);
router.get("/cloud/control-center", requireAuth, enterpriseGlobalControlCenter);
router.get("/cloud/operating-system", requireAuth, enterpriseOperatingSystem);
router.get("/cloud/autonomous-os", requireAuth, enterpriseAutonomousOs);
router.post("/cloud/provider-benchmarks/run", requireAuth, enterpriseRunProviderBenchmarks);
router.post("/cloud/router/recommend", requireAuth, enterpriseRecommendRoute);

export default router;
