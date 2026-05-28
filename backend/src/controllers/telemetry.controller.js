export async function recordTelemetry(req, res, next) {
  try {
    const telemetry = await req.app.locals.runtimeTelemetryService.record({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      nodeId: req.body.nodeId,
      metric: req.body.metric,
      value: req.body.value,
      unit: req.body.unit,
      metadata: req.body.metadata,
    });
    return res.status(201).json({ telemetry });
  } catch (error) {
    return next(error);
  }
}

export async function listTelemetry(req, res, next) {
  try {
    const telemetry = await req.app.locals.runtimeTelemetryService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      metric: req.query.metric,
      limit: Number(req.query.limit || 50),
    });
    return res.status(200).json({ telemetry });
  } catch (error) {
    return next(error);
  }
}

export async function telemetrySummary(req, res, next) {
  try {
    const summary = await req.app.locals.runtimeTelemetryService.summary({
      workspaceId: req.workspace?.id || req.query.workspaceId,
    });
    return res.status(200).json({ summary });
  } catch (error) {
    return next(error);
  }
}

export async function prometheusMetrics(req, res, next) {
  try {
    const workspaceId = req.workspace?.id || req.query.workspaceId || "local-workspace";
    const lines = [];
    const emit = (name, labels, value) => {
      const labelText = Object.entries(labels || {})
        .map(([key, labelValue]) => `${key}="${String(labelValue).replace(/"/g, '\\"')}"`)
        .join(",");
      lines.push(`${name}${labelText ? `{${labelText}}` : ""} ${Number(value) || 0}`);
    };

    const [telemetry, queues, workers, providers, health, billingMeters, jobs] = await Promise.all([
      req.app.locals.runtimeTelemetryService?.summary?.({ workspaceId }).catch(() => []),
      req.app.locals.workerSupervisorService?.queues?.({ workspaceId }).catch(() => null),
      req.app.locals.workerSupervisorService?.workers?.({ workspaceId }).catch(() => null),
      Promise.resolve(req.app.locals.providerHealthService?.snapshot?.() || { metrics: {} }),
      req.app.locals.infrastructureSupervisor?.verifyProductionRuntime?.().catch(() => null),
      req.app.locals.pool?.query(
        `select meter_type, unit, coalesce(sum(quantity), 0)::numeric as quantity
         from usage_billing_meters
         where workspace_id = $1 and created_at >= date_trunc('month', now())
         group by meter_type, unit`,
        [workspaceId]
      ).catch(() => ({ rows: [] })),
      req.app.locals.pool?.query(
        `select kind, status, count(*)::int as count
         from jobs
         where workspace_id = $1 and created_at >= date_trunc('month', now())
         group by kind, status`,
        [workspaceId]
      ).catch(() => ({ rows: [] })),
    ]);

    lines.push("# HELP codrai_runtime_telemetry_samples Runtime telemetry sample counts by metric.");
    lines.push("# TYPE codrai_runtime_telemetry_samples gauge");
    for (const row of telemetry || []) {
      emit("codrai_runtime_telemetry_samples", { workspace: workspaceId, metric: row.metric }, row.samples);
      emit("codrai_runtime_telemetry_avg_value", { workspace: workspaceId, metric: row.metric }, row.avg_value);
    }

    lines.push("# HELP codrai_queue_jobs Queue job counts by status.");
    lines.push("# TYPE codrai_queue_jobs gauge");
    const queueList = queues?.queues || queues?.data?.queues || [];
    for (const queue of queueList) {
      const counts = queue.counts || queue;
      for (const status of ["waiting", "active", "completed", "failed", "delayed"]) {
        emit("codrai_queue_jobs", { workspace: workspaceId, queue: queue.name || queue.queueName || "runtime", status }, counts?.[status] || 0);
      }
    }
    emit("codrai_runtime_workers_online", { workspace: workspaceId }, workers?.summary?.onlineNodes || (workers?.nodes || []).filter((node) => node.status === "online").length);

    lines.push("# HELP codrai_provider_requests Provider request metrics.");
    lines.push("# TYPE codrai_provider_requests counter");
    for (const [provider, metric] of Object.entries(providers.metrics || {})) {
      emit("codrai_provider_requests", { workspace: workspaceId, provider, outcome: "success" }, metric.successCount);
      emit("codrai_provider_requests", { workspace: workspaceId, provider, outcome: "failure" }, metric.failureCount);
      emit("codrai_provider_latency_ms", { workspace: workspaceId, provider }, metric.lastLatencyMs || 0);
    }

    lines.push("# HELP codrai_billing_meter_quantity Monthly billing meter quantity by type.");
    lines.push("# TYPE codrai_billing_meter_quantity gauge");
    for (const row of billingMeters?.rows || []) {
      emit("codrai_billing_meter_quantity", { workspace: workspaceId, meter_type: row.meter_type, unit: row.unit }, row.quantity);
    }

    lines.push("# HELP codrai_jobs_by_kind Monthly jobs grouped by kind and status.");
    lines.push("# TYPE codrai_jobs_by_kind gauge");
    for (const row of jobs?.rows || []) {
      emit("codrai_jobs_by_kind", { workspace: workspaceId, kind: row.kind, status: row.status }, row.count);
    }

    lines.push("# HELP codrai_infrastructure_check Infrastructure check health, 1 ok, 0 not ok.");
    lines.push("# TYPE codrai_infrastructure_check gauge");
    const checks = health?.checks || {};
    for (const [name, check] of Object.entries(checks)) {
      emit("codrai_infrastructure_check", { workspace: workspaceId, check: name }, check?.status === "ok" || check?.ok === true ? 1 : 0);
    }

    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return res.status(200).send(`${lines.join("\n")}\n`);
  } catch (error) {
    return next(error);
  }
}
