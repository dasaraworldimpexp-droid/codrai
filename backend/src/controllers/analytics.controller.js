export async function usageAnalytics(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });
    const workspaceId = req.query.workspaceId || req.workspace?.id;
    const usage = await pool.query(
      `select provider, model, count(*)::int as requests,
              coalesce(sum(input_tokens), 0)::bigint as input_tokens,
              coalesce(sum(output_tokens), 0)::bigint as output_tokens,
              coalesce(avg(latency_ms), 0)::int as avg_latency_ms
       from model_usage_events
       where workspace_id = $1 and created_at >= now() - interval '30 days'
       group by provider, model
       order by requests desc`,
      [workspaceId]
    );
    const tools = await pool.query(
      `select tool_name, status, count(*)::int as count
       from tool_executions
       where workspace_id = $1 and created_at >= now() - interval '30 days'
       group by tool_name, status
       order by count desc`,
      [workspaceId]
    );
    return res.status(200).json({ usage: usage.rows, tools: tools.rows });
  } catch (error) {
    return next(error);
  }
}

export async function modelRoutingAnalytics(req, res, next) {
  try {
    const service = req.app.locals.modelRoutingAnalyticsService;
    if (!service) return res.status(503).json({ message: "Model routing analytics is not configured." });
    const workspaceId = req.query.workspaceId || req.workspace?.id;
    const scores = req.query.refresh === "true"
      ? await service.calculate({ workspaceId })
      : await service.latest({ workspaceId });
    return res.status(200).json({ scores });
  } catch (error) {
    return next(error);
  }
}

export async function aiExecutionAnalytics(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });
    const workspaceId = req.query.workspaceId || req.workspace?.id || "local-workspace";
    const [usage, latency, multimodal, queues] = await Promise.all([
      pool.query(
        `select provider, model, task_type, count(*)::int as requests,
                coalesce(sum(input_tokens), 0)::bigint as input_tokens,
                coalesce(sum(output_tokens), 0)::bigint as output_tokens,
                coalesce(sum(estimated_cost), 0)::numeric(12,6) as estimated_cost
         from model_usage_events
         where workspace_id = $1 and created_at >= now() - interval '30 days'
         group by provider, model, task_type
         order by requests desc`,
        [workspaceId]
      ),
      pool.query(
        `select provider,
                coalesce(avg(latency_ms), 0)::int as avg_latency_ms,
                coalesce(max(latency_ms), 0)::int as max_latency_ms
         from model_usage_events
         where workspace_id = $1 and created_at >= now() - interval '30 days'
         group by provider`,
        [workspaceId]
      ),
      pool.query(
        `select status, count(*)::int as transcripts
         from multimodal_transcripts
         where workspace_id = $1 and created_at >= now() - interval '30 days'
         group by status`,
        [workspaceId]
      ).catch(() => ({ rows: [] })),
      req.app.locals.workerSupervisorService?.queues?.({ workspaceId }).catch(() => null),
    ]);
    return res.status(200).json({
      status: "ready",
      workspaceId,
      generatedAt: new Date().toISOString(),
      usage: usage.rows,
      latency: latency.rows,
      multimodal: multimodal.rows,
      queues,
      providers: req.app.locals.providerHealthService?.snapshot?.() || { metrics: {} },
    });
  } catch (error) {
    return next(error);
  }
}
