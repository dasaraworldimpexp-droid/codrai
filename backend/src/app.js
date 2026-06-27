import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import agentRuntimeRoutes from "./routes/agent-runtime.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import autonomyRoutes from "./routes/autonomy.routes.js";
import autonomousCycleRoutes from "./routes/autonomous-cycle.routes.js";
import authRoutes from "./routes/auth.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import aiStudioRoutes from "./routes/ai-studio.routes.js";
import appFactoryRoutes from "./routes/app-factory.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import brainRoutes from "./routes/brain.routes.js";
import civilizationRuntimeRoutes from "./routes/civilization-runtime.routes.js";
import civilizationNetworkRoutes from "./routes/civilization-network.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import cosmosIntelligenceRoutes from "./routes/cosmos-intelligence.routes.js";
import computerUseRoutes from "./routes/computer-use.routes.js";
import deploymentRoutes from "./routes/deployment.routes.js";
import debugRoutes from "./routes/debug.routes.js";
import developerRoutes from "./routes/developer.routes.js";
import distributedExecutionRoutes from "./routes/distributed-execution.routes.js";
import distributedRuntimeRoutes from "./routes/distributed-runtime.routes.js";
import dynamicToolRoutes from "./routes/dynamic-tool.routes.js";
import emailRoutes from "./routes/email.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import creationRoutes from "./routes/creation.routes.js";
import enterpriseRoutes from "./routes/enterprise.routes.js";
import eventRoutes from "./routes/event.routes.js";
import fileRoutes from "./routes/file.routes.js";
import federationRoutes from "./routes/federation.routes.js";
import globalExecutionGridRoutes from "./routes/global-execution-grid.routes.js";
import infrastructureRoutes from "./routes/infrastructure.routes.js";
import internetExecutionRoutes from "./routes/internet-execution.routes.js";
import marketplaceRoutes from "./routes/marketplace.routes.js";
import memoryRoutes from "./routes/memory.routes.js";
import metaIntelligenceRoutes from "./routes/meta-intelligence.routes.js";
import missionRoutes from "./routes/mission.routes.js";
import mobileRuntimeRoutes from "./routes/mobile-runtime.routes.js";
import multimodalRoutes from "./routes/multimodal.routes.js";
import knowledgeRoutes from "./routes/knowledge.routes.js";
import orchestratorRoutes from "./routes/orchestrator.routes.js";
import openSourceRuntimeRoutes from "./routes/open-source-runtime.routes.js";
import planetaryIntelligenceRoutes from "./routes/planetary-intelligence.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import projectFileRoutes from "./routes/project-file.routes.js";
import productionIntelligenceRoutes from "./routes/production-intelligence.routes.js";
import publicApiRoutes from "./routes/public-api.routes.js";
import quantumIntelligenceRoutes from "./routes/quantum-intelligence.routes.js";
import runtimeRoutes from "./routes/runtime.routes.js";
import securityRoutes from "./routes/security.routes.js";
import selfImprovementRoutes from "./routes/self-improvement.routes.js";
import selfHealingRoutes from "./routes/self-healing.routes.js";
import superintelligenceRoutes from "./routes/superintelligence.routes.js";
import swarmRuntimeRoutes from "./routes/swarm-runtime.routes.js";
import toolRoutes from "./routes/tool.routes.js";
import teamRoutes from "./routes/team.routes.js";
import telemetryRoutes from "./routes/telemetry.routes.js";
import workflowRoutes from "./routes/workflow.routes.js";
import workspaceSessionRoutes from "./routes/workspace-session.routes.js";
import { optionalAuth } from "./middleware/auth.middleware.js";
import { requestTracing } from "./middleware/request-tracing.middleware.js";
import { isAllowedClientOrigin } from "./config/cors.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function detectFrontendDistDir() {
  const candidates = [
    path.resolve(process.cwd(), "backend", "dist"),
    path.resolve(process.cwd(), "dist"),
    path.resolve(__dirname, "../dist"),
    path.resolve(__dirname, "../../backend/dist"),
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html"))) || candidates[0];
}

const frontendDistDir = detectFrontendDistDir();
const frontendIndexFile = path.join(frontendDistDir, "index.html");
const frontendAssetsDir = path.join(frontendDistDir, "assets");

console.log("PWD:", process.cwd());
console.log("DIRNAME:", __dirname);
console.log("frontendDistDir:", frontendDistDir);
console.log("frontendIndexFile:", frontendIndexFile);
console.log("dist exists:", fs.existsSync(frontendDistDir));
console.log("index exists:", fs.existsSync(frontendIndexFile));
console.log("frontendAssetsDir:", frontendAssetsDir);
console.log("assets exists:", fs.existsSync(frontendAssetsDir));

// Hostinger and most production Node.js hosts terminate TLS/reverse proxy traffic
// before Express. express-rate-limit validates X-Forwarded-For only when Express
// explicitly trusts that first proxy hop.
app.set("trust proxy", 1);

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));

app.use("/assets", express.static(frontendAssetsDir, {
  index: false,
  fallthrough: true,
  maxAge: "1y",
  immutable: true,
}));
app.use("/assets", (req, res) => {
  res.status(404).type("text/plain").send(`CODRAI static asset not found: /assets${req.path}`);
});

app.use(cors({
  origin(origin, callback) {
    if (isAllowedClientOrigin(origin)) return callback(null, true);
    return callback(Object.assign(new Error(`CORS origin not allowed: ${origin}`), { statusCode: 403 }));
  },
  credentials: true,
}));
app.use(compression());
app.use(cookieParser());
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buffer) => {
    req.rawBody = buffer.toString("utf8");
  },
}));
app.use(morgan("dev"));
app.use(optionalAuth);
app.use(requestTracing());

app.get("/status", (_req, res) => {
  res.status(200).json({
    status: "ok",
    app: "CODRAI",
    runtime: app.locals.runtimeBootstrapStatus || { status: "starting" },
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    database: Boolean(app.locals.pool),
    server: "running",
    app: "CODRAI API",
    runtime: app.locals.runtimeBootstrapStatus || { status: "starting" },
    websocket: app.locals.websocketStatus || { status: app.locals.websocketServer ? "ready" : "starting" },
    socketio: app.locals.socketIoStatus || { status: app.locals.socketIoServer ? "ready" : "starting" },
    startup: globalThis.__CODRAI_STARTUP_DIAGNOSTICS__ || null,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/startup", (_req, res) => {
  res.status(200).json({
    status: "ok",
    startup: globalThis.__CODRAI_STARTUP_DIAGNOSTICS__ || null,
    runtime: app.locals.runtimeBootstrapStatus || { status: "starting" },
    websocket: app.locals.websocketStatus || { status: app.locals.websocketServer ? "ready" : "starting" },
    socketio: app.locals.socketIoStatus || { status: app.locals.socketIoServer ? "ready" : "starting" },
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/runtime", runtimeRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
console.log("Auth route loaded", { mounts: ["/api/auth", "/auth"] });
console.log("Forgot password endpoint registered", {
  endpoints: ["POST /api/auth/forgot-password", "POST /auth/forgot-password"],
});
app.use("/api/ai-studio", aiStudioRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/brain", brainRoutes);
app.use("/api/civilization-runtime", civilizationRuntimeRoutes);
app.use("/api/civilization-network", civilizationNetworkRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/cosmos-intelligence", cosmosIntelligenceRoutes);
app.use("/api/deployment", deploymentRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/distributed-execution", distributedExecutionRoutes);
app.use("/api/distributed-runtime", distributedRuntimeRoutes);
app.use("/api/dynamic-tools", dynamicToolRoutes);
app.use("/api", emailRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/self-improvement", selfImprovementRoutes);
app.use("/api/self-healing", selfHealingRoutes);
app.use("/api/superintelligence", superintelligenceRoutes);
app.use("/api/swarm-runtime", swarmRuntimeRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/autonomous-cycles", autonomousCycleRoutes);
app.use("/api/app-factory", appFactoryRoutes);
app.use("/api/computer-use", computerUseRoutes);
app.use("/api/agents", agentRuntimeRoutes);
app.use("/api/autonomy", autonomyRoutes);
app.use("/api/creation", creationRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/v1", publicApiRoutes);
app.use("/api/projects", projectFileRoutes);
app.use("/api/production-intelligence", productionIntelligenceRoutes);
app.use("/api/quantum-intelligence", quantumIntelligenceRoutes);
app.use("/api/enterprise", enterpriseRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/meta-intelligence", metaIntelligenceRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/mobile", mobileRuntimeRoutes);
app.use("/api/multimodal", multimodalRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/orchestrator", orchestratorRoutes);
app.use("/api/open-source", openSourceRuntimeRoutes);
app.use("/api/planetary-intelligence", planetaryIntelligenceRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/workspace", workspaceSessionRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/federation", federationRoutes);
app.use("/api/global-execution-grid", globalExecutionGridRoutes);
app.use("/api/infrastructure", infrastructureRoutes);
app.use("/api/internet-execution", internetExecutionRoutes);
app.use("/api/telemetry", telemetryRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({
    message: "CODRAI API route not found.",
    status: "failed",
    timestamp: new Date().toISOString(),
  });
});

app.use(express.static(frontendDistDir, {
  index: false,
  maxAge: "1y",
  immutable: true,
  setHeaders(res, filePath) {
    if (filePath === frontendIndexFile || filePath.endsWith(".webmanifest") || filePath.endsWith("sw.js")) {
      res.setHeader("Cache-Control", "no-store");
    }
  },
}));

app.get("*", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!fs.existsSync(frontendIndexFile)) {
    return res.status(503).json({
      status: "error",
      message: "CODRAI frontend build path could not be resolved.",
      cwd: process.cwd(),
      dirname: __dirname,
      frontendDistDir,
      frontendIndexFile,
      distExists: fs.existsSync(frontendDistDir),
      indexExists: fs.existsSync(frontendIndexFile),
    });
  }
  res.sendFile(frontendIndexFile, (err) => {
    if (!err) return;
    next(Object.assign(new Error(`CODRAI frontend sendFile failed for ${frontendIndexFile}: ${err.message}`), {
      statusCode: 503,
      frontendDistDir,
      frontendIndexFile,
      distExists: fs.existsSync(frontendDistDir),
      indexExists: fs.existsSync(frontendIndexFile),
    }));
  });
});

function runtimeErrorMessage(err) {
  if (err?.message) return err.message;
  if (Array.isArray(err?.errors) && err.errors.length) {
    return err.errors.map((item) => item.message || item.code).filter(Boolean).join("; ");
  }
  return "CODRAI runtime error";
}

app.use((err, _req, res, _next) => {
  const statusCode = Number(err.statusCode || err.status || 500);
  const payload = {
    message: runtimeErrorMessage(err),
    status: statusCode >= 500 ? "error" : "failed",
    timestamp: new Date().toISOString(),
  };
  if (err.code) payload.code = err.code;
  if (err.diagnostic) payload.diagnostic = err.diagnostic;
  res.status(statusCode).json(payload);
});

export default app;
