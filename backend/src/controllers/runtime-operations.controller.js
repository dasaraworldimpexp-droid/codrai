const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId || "local-workspace";
const user = (req) => req.user?.id || req.body.userId || req.query.userId;

async function measure(name, fn) {
  const startedAt = Date.now();
  try {
    const data = await fn();
    return {
      name,
      ok: true,
      latencyMs: Date.now() - startedAt,
      data,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error?.message || String(error),
    };
  }
}

async function rows(pool, query, params = []) {
  try {
    const result = await pool.query(query, params);
    return { ok: true, rows: result.rows };
  } catch (error) {
    return { ok: false, rows: [], error: error?.message || String(error) };
  }
}

function node(id, type, label, status, metadata = {}) {
  return { id, type, label, status: status || "unknown", metadata };
}

function edge(source, target, label, metadata = {}) {
  return { source, target, label, metadata };
}

export async function runtimeWorkers(req, res, next) {
  try {
    const result = await req.app.locals.workerSupervisorService.workers({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function registerRuntimeWorker(req, res, next) {
  try {
    const result = await req.app.locals.workerSupervisorService.register({
      workspaceId: workspace(req),
      nodeName: req.body.nodeName,
      capabilities: req.body.capabilities || [],
      loadScore: req.body.loadScore,
      metadata: { ...(req.body.metadata || {}), nodeToken: req.headers["x-worker-node-token"] || req.body.nodeToken },
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function scheduleRuntimeWorkerTask(req, res, next) {
  try {
    const result = await req.app.locals.workerSupervisorService.schedule({
      workspaceId: workspace(req),
      userId: user(req),
      taskType: req.body.taskType,
      requiredCapability: req.body.requiredCapability,
      priority: req.body.priority,
      payload: req.body.payload || {},
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeContainers(req, res, next) {
  try {
    const result = await req.app.locals.containerRuntimeService.status({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeContainerLifecycle(req, res, next) {
  try {
    const result = await req.app.locals.containerRuntimeService.lifecycle({
      workspaceId: workspace(req),
      serviceName: req.body.serviceName,
      action: req.body.action,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeQueues(req, res, next) {
  try {
    const result = await req.app.locals.workerSupervisorService.queues({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeGpuTelemetry(req, res, next) {
  try {
    const service = req.app.locals.gpuCapabilityService;
    if (!service) return res.status(503).json({ message: "GPU capability service is not configured." });
    const result = await service.status({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeCpuTelemetry(req, res, next) {
  try {
    const service = req.app.locals.cpuRuntimeService;
    if (!service) return res.status(503).json({ message: "CPU runtime service is not configured." });
    const result = await service.status({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeCluster(req, res, next) {
  try {
    const workspaceId = workspace(req);
    const locals = req.app.locals;
    const [workers, queues, gpu, containers] = await Promise.all([
      locals.workerSupervisorService.workers({ workspaceId }),
      locals.workerSupervisorService.queues({ workspaceId }),
      locals.gpuCapabilityService?.status?.({ workspaceId }).catch((error) => ({ status: "blocked", reason: error.message })),
      locals.containerRuntimeService.status({ workspaceId }).catch((error) => ({ status: "blocked", reason: error.message })),
    ]);
    const nodeCount = workers.nodes?.length || 0;
    const result = {
      status: queues.status === "ready" ? "ready" : "degraded",
      workspaceId,
      generatedAt: new Date().toISOString(),
      topology: {
        mode: nodeCount > 1 ? "distributed" : "single-node-local",
        nodes: workers.nodes || [],
        nodeCount,
        balancing: nodeCount > 1 ? "capability_and_load_score" : "local_worker_queue",
      },
      queues,
      workers,
      gpu,
      containers,
      scheduling: {
        strategy: "redis_queue_with_worker_supervisor",
        distributedRetries: true,
        cpuFirstFallback: true,
      },
    };
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeJobReplay(req, res, next) {
  try {
    const workspaceId = workspace(req);
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "Runtime job replay requires PostgreSQL DATABASE_URL." });
    const [jobs, summary, events] = await Promise.all([
      pool.query(
        `select id, queue_name, kind, status, payload, result, error, metadata, created_at, updated_at, completed_at
         from jobs where workspace_id = $1 order by created_at desc limit $2`,
        [workspaceId, Number(req.query.limit || 30)]
      ),
      pool.query(
        `select queue_name, status, count(*)::int as count
         from jobs where workspace_id = $1 group by queue_name, status order by queue_name, status`,
        [workspaceId]
      ),
      pool.query(
        `select type, channel, payload, created_at
         from realtime_events
         where workspace_id = $1 and (type like 'queue.%' or type like 'job.%' or type like 'multimodal.%')
         order by created_at desc limit $2`,
        [workspaceId, Number(req.query.limit || 30)]
      ),
    ]);
    const sanitizePayload = (payload = {}) => {
      if (!payload || typeof payload !== "object") return payload;
      const clone = { ...payload };
      if (clone.file && typeof clone.file === "object") {
        clone.file = {
          originalname: clone.file.originalname,
          mimetype: clone.file.mimetype,
          bufferBase64: clone.file.bufferBase64 ? "[redacted]" : undefined,
        };
      }
      if (clone.task?.input?.text && String(clone.task.input.text).length > 600) {
        clone.task = {
          ...clone.task,
          input: {
            ...clone.task.input,
            text: `${String(clone.task.input.text).slice(0, 600)}...`,
          },
        };
      }
      return clone;
    };
    const sanitizedJobs = jobs.rows.map((job) => ({
      ...job,
      payload: sanitizePayload(job.payload),
    }));
    return res.status(200).json({
      status: "ready",
      workspaceId,
      generatedAt: new Date().toISOString(),
      jobs: sanitizedJobs,
      summary: summary.rows,
      events: events.rows,
      replay: sanitizedJobs.map((job) => ({
        id: job.id,
        queue: job.queue_name,
        kind: job.kind,
        status: job.status,
        at: job.completed_at || job.updated_at || job.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

export async function runtimeFailover(req, res, next) {
  try {
    const result = await req.app.locals.runtimeRecoveryService.failover({
      workspaceId: workspace(req),
      userId: user(req),
      strategy: req.body.strategy,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeRecovery(req, res, next) {
  try {
    const result = await req.app.locals.runtimeRecoveryService.recover({
      workspaceId: workspace(req),
      userId: user(req),
      recoveryType: req.body.recoveryType,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeRecoverStaleExecutions(req, res, next) {
  try {
    const result = await req.app.locals.runtimeRecoveryService.recoverStaleExecutions({
      workspaceId: workspace(req),
      userId: user(req),
      dryRun: req.body.dryRun === true,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeDiagnostics(req, res, next) {
  try {
    const workspaceId = workspace(req);
    const locals = req.app.locals;
    const checks = await Promise.all([
      measure("postgres", async () => {
        const result = await locals.pool.query("select now() as server_time");
        return { serverTime: result.rows[0]?.server_time };
      }),
      measure("redis", async () => {
        if (!locals.redis) return { configured: false };
        return { configured: true, pong: await locals.redis.ping() };
      }),
      measure("queues", async () => locals.workerSupervisorService.queues({ workspaceId })),
      measure("workers", async () => locals.workerSupervisorService.workers({ workspaceId })),
      measure("containers", async () => locals.containerRuntimeService.status({ workspaceId })),
    ]);

    const providerSnapshot = locals.providerHealthService?.snapshot?.() || {};
    const providers = locals.providerRegistry?.listProviders?.().map((provider) => ({
      name: provider.providerName,
      type: provider.providerType,
      supportsStreaming: Boolean(provider.supportsStreaming || provider.stream),
      maxTokens: provider.maxTokens || null,
      score: locals.providerHealthService?.scoreProvider?.(provider) || null,
    })) || [];

    return res.status(200).json({
      status: checks.every((check) => check.ok) ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      providers,
      providerMetrics: providerSnapshot.metrics || {},
      providerHealthCache: providerSnapshot.cache || {},
      realtime: {
        eventBus: locals.eventBus?.snapshot?.() || null,
        websocket: locals.websocketServer?.metricsSnapshot?.() || null,
        socketio: locals.socketIoServer?.metricsSnapshot?.() || null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function runtimeEnterpriseCompletion(req, res, next) {
  try {
    const workspaceId = workspace(req);
    const locals = req.app.locals;
    const pool = locals.pool;
    if (!pool) return res.status(503).json({ message: "Enterprise runtime completion requires PostgreSQL DATABASE_URL." });
    const [
      cpu,
      diagnostics,
      operator,
      cluster,
      whisper,
      transcriptAnalytics,
      deploymentReplay,
      telemetrySummary,
      distributedAnalytics,
    ] = await Promise.all([
      measure("cpu", async () => locals.cpuRuntimeService.status({ workspaceId })),
      measure("runtime_diagnostics", async () => {
        const checks = await Promise.all([
          measure("postgres", async () => ({ serverTime: (await pool.query("select now() as server_time")).rows[0]?.server_time })),
          measure("redis", async () => ({ pong: await locals.redis.ping() })),
          measure("queues", async () => locals.workerSupervisorService.queues({ workspaceId })),
          measure("workers", async () => locals.workerSupervisorService.workers({ workspaceId })),
        ]);
        return { status: checks.every((check) => check.ok) ? "ok" : "degraded", checks };
      }),
      measure("operator_console", async () => {
        const [jobs, workflows, events] = await Promise.all([
          rows(pool, "select status, count(*)::int as count from jobs where workspace_id = $1 group by status", [workspaceId]),
          rows(pool, "select status, count(*)::int as count from workflow_runs where workspace_id = $1 group by status", [workspaceId]),
          rows(pool, "select type, count(*)::int as count, max(created_at) as last_seen_at from realtime_events where workspace_id = $1 and created_at >= now() - interval '24 hours' group by type order by count desc limit 12", [workspaceId]),
        ]);
        return { jobs: jobs.rows, workflows: workflows.rows, events: events.rows };
      }),
      measure("cluster", async () => {
        const [workers, queues] = await Promise.all([
          locals.workerSupervisorService.workers({ workspaceId }),
          locals.workerSupervisorService.queues({ workspaceId }),
        ]);
        return { workers, queues };
      }),
      measure("whisper", async () => locals.multimodalCapabilityService.whisperDiagnostics({ workspaceId })),
      measure("transcripts", async () => locals.multimodalCapabilityService.transcriptAnalytics({ workspaceId })),
      measure("deployments", async () => locals.cloudDeploymentService.replayHistory({ workspaceId, limit: 20 })),
      measure("telemetry", async () => locals.runtimeTelemetryService.summary({ workspaceId })),
      measure("distributed_execution", async () => locals.distributedExecutionService.analytics({ workspaceId })),
    ]);

    const checks = [cpu, diagnostics, cluster, whisper, transcriptAnalytics, deploymentReplay, telemetrySummary, distributedAnalytics];
    const hardFailures = checks.filter((check) => !check.ok);
    const blocked = [whisper, deploymentReplay].filter((check) => check.ok && check.data?.status === "blocked");
    return res.status(200).json({
      status: hardFailures.length ? "degraded" : blocked.length ? "ready_with_blockers" : "ready",
      workspaceId,
      generatedAt: new Date().toISOString(),
      mode: "cpu_first",
      gpu: "disabled",
      completionScore: Math.max(0, Math.round(100 - hardFailures.length * 12 - blocked.length * 5)),
      systems: {
        cpu,
        diagnostics,
        operator,
        cluster,
        whisper,
        transcripts: transcriptAnalytics,
        deployments: deploymentReplay,
        telemetry: telemetrySummary,
        distributedExecution: distributedAnalytics,
      },
      policies: {
        noCuda: true,
        lowResource: true,
        workerNodeTokenEnabled: Boolean(process.env.WORKER_NODE_TOKEN),
        whisperRequiresExplicitModel: true,
      },
      blockers: [
        whisper.ok && whisper.data?.status !== "ready"
          ? { system: "whisper", reason: "Configure WHISPER_CPP_BIN and WHISPER_MODEL_PATH/WHISPER_CPP_MODEL for real CPU speech-to-text." }
          : null,
        ...hardFailures.map((check) => ({ system: check.name, reason: check.error })),
      ].filter(Boolean),
    });
  } catch (error) {
    return next(error);
  }
}

export async function runtimeOperatorConsole(req, res, next) {
  try {
    const workspaceId = workspace(req);
    const locals = req.app.locals;
    const pool = locals.pool;
    if (!pool) throw new Error("Runtime operator console requires PostgreSQL DATABASE_URL.");

    const [
      agentRuns,
      agentSteps,
      workflowRuns,
      browserSessions,
      jobs,
      jobSummary,
      realtimeEvents,
      requestStats,
      memorySummary,
      recentMemories,
      staleAgents,
      staleBrowserSessions,
      staleJobs,
    ] = await Promise.all([
      rows(pool, `select id, objective, status, created_at, updated_at, completed_at
                  from agent_runs where workspace_id = $1 order by created_at desc limit 12`, [workspaceId]),
      rows(pool, `select ar.id as run_id,
                         count(ars.id)::int as steps,
                         count(ars.id) filter (where ars.status = 'completed')::int as completed_steps,
                         count(ars.id) filter (where ars.status = 'failed')::int as failed_steps
                  from agent_runs ar
                  left join agent_run_steps ars on ars.run_id = ar.id
                  where ar.workspace_id = $1
                  group by ar.id`, [workspaceId]),
      rows(pool, `select id, definition_id, status, jsonb_array_length(steps) as steps, created_at, updated_at, completed_at
                  from workflow_runs where workspace_id = $1 order by created_at desc limit 10`, [workspaceId]),
      rows(pool, `select id, status, current_url, jsonb_array_length(navigation_memory) as snapshots, created_at, updated_at, completed_at
                  from browser_sessions where workspace_id = $1 order by created_at desc limit 10`, [workspaceId]),
      rows(pool, `select id, queue_name, kind, status, created_at, updated_at, completed_at
                  from jobs where workspace_id = $1 order by created_at desc limit 16`, [workspaceId]),
      rows(pool, `select status, count(*)::int as count
                  from jobs where workspace_id = $1 group by status`, [workspaceId]),
      rows(pool, `select type, channel, count(*)::int as count, max(created_at) as last_seen_at
                  from realtime_events
                  where workspace_id = $1 and created_at >= now() - interval '24 hours'
                  group by type, channel order by count desc limit 16`, [workspaceId]),
      rows(pool, `select count(*)::int as count,
                         coalesce(round(avg(latency_ms))::int, 0) as avg_ms,
                         coalesce(max(latency_ms)::int, 0) as max_ms
                  from request_traces
                  where workspace_id = $1 and created_at >= now() - interval '24 hours'`, [workspaceId]),
      rows(pool, `select count(*)::int as total from ai_memories where workspace_id = $1`, [workspaceId]),
      rows(pool, `select id, content, metadata, created_at
                  from ai_memories where workspace_id = $1 order by created_at desc limit 8`, [workspaceId]),
      rows(pool, `select id, objective, status, updated_at, created_at
                  from agent_runs
                  where workspace_id = $1
                    and status in ('planning', 'running')
                    and coalesce(updated_at, created_at) < now() - interval '15 minutes'
                  order by coalesce(updated_at, created_at) asc limit 8`, [workspaceId]),
      rows(pool, `select id, current_url, status, updated_at, created_at
                  from browser_sessions
                  where workspace_id = $1
                    and status = 'running'
                    and coalesce(updated_at, created_at) < now() - interval '10 minutes'
                  order by coalesce(updated_at, created_at) asc limit 8`, [workspaceId]),
      rows(pool, `select id, queue_name, kind, status, updated_at, created_at
                  from jobs
                  where workspace_id = $1
                    and status in ('queued', 'running', 'active', 'waiting')
                    and coalesce(updated_at, created_at) < now() - interval '15 minutes'
                  order by coalesce(updated_at, created_at) asc limit 8`, [workspaceId]),
    ]);

    const stepMap = new Map(agentSteps.rows.map((item) => [item.run_id, item]));
    const graphNodes = [node(`workspace:${workspaceId}`, "workspace", workspaceId, "active")];
    const graphEdges = [];

    for (const run of agentRuns.rows) {
      const runNode = node(`agent:${run.id}`, "agent_run", run.objective, run.status, {
        id: run.id,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        completedAt: run.completed_at,
        steps: stepMap.get(run.id) || { steps: 0, completed_steps: 0, failed_steps: 0 },
      });
      graphNodes.push(runNode);
      graphEdges.push(edge(`workspace:${workspaceId}`, runNode.id, "agent"));
    }

    for (const run of workflowRuns.rows) {
      const workflowNode = node(`workflow:${run.id}`, "workflow_run", run.definition_id, run.status, {
        id: run.id,
        steps: run.steps,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
      });
      graphNodes.push(workflowNode);
      graphEdges.push(edge(`workspace:${workspaceId}`, workflowNode.id, "workflow"));
    }

    for (const session of browserSessions.rows) {
      const browserNode = node(`browser:${session.id}`, "browser_session", session.current_url || session.id, session.status, {
        id: session.id,
        snapshots: session.snapshots,
        createdAt: session.created_at,
        completedAt: session.completed_at,
      });
      graphNodes.push(browserNode);
      graphEdges.push(edge(`workspace:${workspaceId}`, browserNode.id, "browser"));
    }

    for (const job of jobs.rows.slice(0, 10)) {
      const jobNode = node(`job:${job.id}`, "job", `${job.queue_name}/${job.kind}`, job.status, {
        id: job.id,
        queueName: job.queue_name,
        kind: job.kind,
        createdAt: job.created_at,
      });
      graphNodes.push(jobNode);
      graphEdges.push(edge(`workspace:${workspaceId}`, jobNode.id, "queue"));
    }

    const queueTelemetry = await measure("queues", async () => locals.workerSupervisorService.queues({ workspaceId }));
    const workerTelemetry = await measure("workers", async () => locals.workerSupervisorService.workers({ workspaceId }));

    return res.status(200).json({
      status: "ready",
      workspaceId,
      generatedAt: new Date().toISOString(),
      executionGraph: {
        nodes: graphNodes,
        edges: graphEdges,
        source: "postgres-runtime-state",
      },
      telemetry: {
        queues: queueTelemetry,
        workers: workerTelemetry,
        jobSummary: jobSummary.rows,
        realtimeEvents: realtimeEvents.rows,
        requestStats: requestStats.rows[0] || { count: 0, avg_ms: 0, max_ms: 0 },
        realtime: {
          eventBus: locals.eventBus?.snapshot?.() || null,
          websocket: locals.websocketServer?.metricsSnapshot?.() || null,
          socketio: locals.socketIoServer?.metricsSnapshot?.() || null,
        },
      },
      memory: {
        total: memorySummary.rows[0]?.total || 0,
        recent: recentMemories.rows,
      },
      recovery: {
        staleAgents: staleAgents.rows,
        staleBrowserSessions: staleBrowserSessions.rows,
        staleJobs: staleJobs.rows,
        status: staleAgents.rows.length || staleBrowserSessions.rows.length || staleJobs.rows.length ? "attention" : "clear",
      },
      routing: {
        localFirst: process.env.CODRAI_LOCAL_FIRST === "true",
        localRouting: process.env.CODRAI_LOCAL_ROUTING === "true",
        gpu: "disabled_cpu_first",
        roles: {
          tiny: process.env.CODRAI_TINY_MODEL || "tinyllama",
          fast: process.env.CODRAI_FAST_MODEL || "deepseek-coder",
          reasoning: process.env.CODRAI_REASONING_MODEL || "llama3.1",
          coding: process.env.CODRAI_CODING_MODEL || "deepseek-coder",
          heavyCoding: process.env.CODRAI_HEAVY_CODING_MODEL || "qwen2.5-coder",
        },
      },
      errors: [
        agentRuns.ok ? null : { source: "agent_runs", error: agentRuns.error },
        workflowRuns.ok ? null : { source: "workflow_runs", error: workflowRuns.error },
        browserSessions.ok ? null : { source: "browser_sessions", error: browserSessions.error },
        jobs.ok ? null : { source: "jobs", error: jobs.error },
        realtimeEvents.ok ? null : { source: "realtime_events", error: realtimeEvents.error },
        requestStats.ok ? null : { source: "request_traces", error: requestStats.error },
      ].filter(Boolean),
    });
  } catch (error) {
    return next(error);
  }
}
