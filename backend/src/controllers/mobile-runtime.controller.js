import { randomUUID } from "node:crypto";
import { BillingService } from "../services/billing.service.js";

function resolveWorkspace(req) {
  return req.workspace?.id || req.query.workspaceId || req.body.workspaceId || "local-workspace";
}

export async function mobileRuntimeStatus(req, res, next) {
  try {
    const workspaceId = resolveWorkspace(req);
    const [queues, workers, telemetry, providers, billing] = await Promise.all([
      req.app.locals.workerSupervisorService?.queues?.({ workspaceId }).catch((error) => ({ status: "blocked", error: error.message })),
      req.app.locals.workerSupervisorService?.workers?.({ workspaceId }).catch((error) => ({ status: "blocked", error: error.message })),
      req.app.locals.runtimeTelemetryService?.summary?.({ workspaceId }).catch(() => []),
      Promise.resolve(req.app.locals.providerHealthService?.snapshot?.() || { metrics: {} }),
      new BillingService({ pool: req.app.locals.pool }).status({ workspaceId }).catch((error) => ({ status: "blocked", error: error.message })),
    ]);

    return res.status(200).json({
      status: "ready",
      workspaceId,
      mode: "cpu_first_low_bandwidth",
      realtime: {
        websocketPath: "/ws",
        eventsEndpoint: "/api/events",
        recovery: "client_reconnect_with_workspace_sync",
      },
      queues,
      workers,
      telemetry,
      providers,
      billing,
      mobileCapabilities: [
        "low_bandwidth_runtime_snapshot",
        "websocket_recovery_metadata",
        "offline_action_queue",
        "queued_notification_events",
      ],
      blockedCapabilities: {
        nativePushDelivery: "No APNs/FCM provider is configured. Notification requests are queued and observable only.",
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function queueMobileSync(req, res, next) {
  try {
    const workspaceId = resolveWorkspace(req);
    const actions = Array.isArray(req.body.actions) ? req.body.actions.slice(0, 50) : [];
    if (!actions.length) {
      throw Object.assign(new Error("actions must contain at least one queued mobile action."), { statusCode: 400 });
    }

    const jobs = [];
    for (const action of actions) {
      const actionId = action.id || randomUUID();
      const job = await req.app.locals.backgroundProcessor.enqueue({
        queueName: "mobile.sync",
        workspaceId,
        projectId: action.projectId || null,
        kind: "mobile_sync",
        payload: {
          actionId,
          type: action.type || "unknown",
          payload: action.payload || {},
          clientCreatedAt: action.createdAt || null,
          lowBandwidth: Boolean(req.body.lowBandwidth),
        },
        idempotencyKey: `mobile:${workspaceId}:${actionId}`,
      });
      jobs.push({ actionId, jobId: job.id, status: job.status });
    }

    await req.app.locals.eventBus?.publish?.({
      type: "mobile.sync.queued",
      channel: `workspace:${workspaceId}`,
      workspaceId,
      payload: { count: jobs.length, jobIds: jobs.map((job) => job.jobId) },
    });

    return res.status(202).json({ status: "queued", workspaceId, jobs });
  } catch (error) {
    return next(error);
  }
}

export async function queueMobileNotification(req, res, next) {
  try {
    const workspaceId = resolveWorkspace(req);
    const job = await req.app.locals.backgroundProcessor.enqueue({
      queueName: "notifications",
      workspaceId,
      projectId: req.body.projectId || null,
      kind: "mobile_notification",
      payload: {
        title: String(req.body.title || "CODRAI notification").slice(0, 160),
        body: String(req.body.body || "").slice(0, 1000),
        target: req.body.target || "workspace",
        metadata: req.body.metadata || {},
        delivery: "queued_only_until_push_provider_configured",
      },
      idempotencyKey: req.body.idempotencyKey || `notification:${workspaceId}:${randomUUID()}`,
    });

    await req.app.locals.eventBus?.publish?.({
      type: "mobile.notification.queued",
      channel: `workspace:${workspaceId}`,
      workspaceId,
      payload: { jobId: job.id, delivery: "queued_only" },
    });

    return res.status(202).json({
      status: "queued",
      workspaceId,
      jobId: job.id,
      blockedDelivery: "No APNs/FCM adapter is configured, so native delivery is not claimed.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function mobilePushAdapters(req, res, next) {
  try {
    const workspaceId = resolveWorkspace(req);
    const adapters = [
      {
        name: "web_push",
        configured: Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY),
        requiredEnv: ["WEB_PUSH_PUBLIC_KEY", "WEB_PUSH_PRIVATE_KEY"],
      },
      {
        name: "fcm",
        configured: Boolean(process.env.FCM_SERVER_KEY || process.env.FCM_SERVICE_ACCOUNT_JSON),
        requiredEnv: ["FCM_SERVER_KEY or FCM_SERVICE_ACCOUNT_JSON"],
      },
      {
        name: "apns",
        configured: Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY),
        requiredEnv: ["APNS_KEY_ID", "APNS_TEAM_ID", "APNS_PRIVATE_KEY"],
      },
    ];
    return res.status(200).json({
      status: adapters.some((adapter) => adapter.configured) ? "ready" : "blocked",
      workspaceId,
      adapters,
      deliveryMode: adapters.some((adapter) => adapter.configured) ? "adapter_ready" : "queued_only",
      blockedReason: adapters.some((adapter) => adapter.configured)
        ? null
        : "No push provider credentials are configured. Mobile notification events will remain queued and observable.",
    });
  } catch (error) {
    return next(error);
  }
}
