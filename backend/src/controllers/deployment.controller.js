import { access } from "node:fs/promises";
import { join } from "node:path";

export async function diagnostics(req, res) {
  const checks = [];

  async function check(name, fn) {
    try {
      const detail = await fn();
      checks.push({ name, status: "ok", detail });
    } catch (error) {
      checks.push({ name, status: "error", error: error.message });
    }
  }

  await check("postgres", async () => {
    if (!req.app.locals.pool) throw new Error("DATABASE_URL is not configured.");
    await req.app.locals.pool.query("select 1");
    return "connected";
  });

  await check("redis", async () => {
    if (!req.app.locals.redis) throw new Error("REDIS_URL is not configured.");
    return req.app.locals.redis.ping();
  });

  await check("docker-compose", async () => {
    await access(join(process.cwd(), "..", "docker-compose.yml"));
    return "present";
  });

  await check("kubernetes", async () => {
    await access(join(process.cwd(), "..", "k8s", "backend-deployment.yaml"));
    return "present";
  });

  await check("providers", async () => {
    const providers = req.app.locals.providerRegistry?.listProviders?.() || [];
    return providers.map((provider) => provider.providerName);
  });

  return res.status(200).json({
    status: checks.every((item) => item.status === "ok") ? "ready" : "needs_attention",
    checks,
    generatedAt: new Date().toISOString(),
  });
}

export async function productionReadiness(req, res, next) {
  try {
    const workspaceId = req.workspace?.id || req.query.workspaceId || "local-workspace";
    const [infrastructure, verification, providers, queues, whisper] = await Promise.all([
      req.app.locals.infrastructureSupervisor?.diagnostics?.().catch((error) => ({ status: "blocked", error: error.message })),
      req.app.locals.infrastructureSupervisor?.verifyProductionRuntime?.().catch((error) => ({ status: "blocked", error: error.message })),
      req.app.locals.providerHealthService ? Promise.resolve(req.app.locals.providerHealthService.snapshot()) : Promise.resolve({ metrics: {} }),
      req.app.locals.workerSupervisorService?.queues?.({ workspaceId }).catch((error) => ({ status: "blocked", error: error.message })),
      req.app.locals.multimodalCapabilityService?.whisperDiagnostics?.({ workspaceId }).catch((error) => ({ status: "blocked", reason: error.message })),
    ]);
    const checks = [
      { name: "postgres", status: verification?.checks?.postgres?.status || infrastructure?.checks?.postgres?.status || "unknown" },
      { name: "redis", status: verification?.checks?.redis?.status || infrastructure?.checks?.redis?.status || queues?.redis?.status || "unknown" },
      { name: "queues", status: queues?.status || "unknown" },
      { name: "providers", status: Object.keys(providers.metrics || {}).length > 0 ? "observed" : "configured_for_validation" },
      { name: "whisper_cpu", status: whisper?.status || "unknown", reason: whisper?.activation?.nextRequirements?.join(" ") || whisper?.reason },
      { name: "docker_compose", status: "present" },
    ];
    const readyCount = checks.filter((check) => ["ok", "ready", "observed", "present", "configured_for_validation"].includes(check.status)).length;
    return res.status(200).json({
      status: readyCount >= 4 ? "production_ready_with_blockers" : "needs_attention",
      workspaceId,
      readinessPercent: Math.round((readyCount / checks.length) * 100),
      generatedAt: new Date().toISOString(),
      checks,
      deployment: {
        nginx: "frontend_container_nginx",
        sslTls: process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH ? "configured" : "external_terminator_required",
        rollingRestart: "compose_targeted_rebuild_supported",
        backupStrategy: "postgres_volume_backup_required_before_cloud_cutover",
        restoreValidation: "manual_restore_endpoint_not_enabled",
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function infrastructureStatus(req, res, next) {
  try {
    const supervisor = req.app.locals.infrastructureSupervisor;
    if (!supervisor) return res.status(503).json({ message: "Infrastructure supervisor is not configured." });
    const status = await supervisor.diagnostics();
    return res.status(200).json(status);
  } catch (error) {
    return next(error);
  }
}

export async function recoverInfrastructure(req, res, next) {
  try {
    const supervisor = req.app.locals.infrastructureSupervisor;
    if (!supervisor) return res.status(503).json({ message: "Infrastructure supervisor is not configured." });
    const recovery = await supervisor.recover({ runMigrations: req.body.runMigrations === true });
    return res.status(202).json(recovery);
  } catch (error) {
    return next(error);
  }
}

export async function verifyInfrastructure(req, res, next) {
  try {
    const supervisor = req.app.locals.infrastructureSupervisor;
    if (!supervisor) return res.status(503).json({ message: "Infrastructure supervisor is not configured." });
    const verification = await supervisor.verifyProductionRuntime();
    return res.status(200).json(verification);
  } catch (error) {
    return next(error);
  }
}

export async function createDeploymentPlan(req, res, next) {
  try {
    const plan = await req.app.locals.cloudDeploymentService.createPlan({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      target: req.body.target,
    });
    return res.status(201).json({ plan });
  } catch (error) {
    return next(error);
  }
}

export async function listDeploymentPlans(req, res, next) {
  try {
    const plans = await req.app.locals.cloudDeploymentService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ plans });
  } catch (error) {
    return next(error);
  }
}

export async function executeDeploymentPlan(req, res, next) {
  try {
    const plan = await req.app.locals.cloudDeploymentService.execute({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      planId: req.params.planId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json({ plan });
  } catch (error) {
    return next(error);
  }
}

export async function healthCheckDeploymentPlan(req, res, next) {
  try {
    const checks = await req.app.locals.cloudDeploymentService.healthCheck({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      planId: req.params.planId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json({ checks });
  } catch (error) {
    return next(error);
  }
}

export async function listDeploymentSnapshots(req, res, next) {
  try {
    const snapshots = await req.app.locals.cloudDeploymentService.listSnapshots({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      planId: req.params.planId,
    });
    return res.status(200).json({ snapshots });
  } catch (error) {
    return next(error);
  }
}

export async function createDeploymentSnapshot(req, res, next) {
  try {
    const snapshot = await req.app.locals.cloudDeploymentService.createSnapshot({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      planId: req.params.planId,
      userId: req.user?.id || req.body.userId,
      label: req.body.label,
    });
    return res.status(201).json({ snapshot });
  } catch (error) {
    return next(error);
  }
}

export async function rollbackDeploymentSnapshot(req, res, next) {
  try {
    const rollback = await req.app.locals.cloudDeploymentService.rollback({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      planId: req.params.planId,
      snapshotId: req.body.snapshotId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json({ rollback });
  } catch (error) {
    return next(error);
  }
}

export async function deploymentReplayHistory(req, res, next) {
  try {
    const replay = await req.app.locals.cloudDeploymentService.replayHistory({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 30),
    });
    return res.status(200).json(replay);
  } catch (error) {
    return next(error);
  }
}

export async function deploymentTemplates(req, res, next) {
  try {
    const templates = await req.app.locals.cloudDeploymentService.templates({
      workspaceId: req.workspace?.id || req.query.workspaceId,
    });
    return res.status(200).json(templates);
  } catch (error) {
    return next(error);
  }
}
