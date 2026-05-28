import { randomUUID } from "node:crypto";

export class RuntimeRecoveryService {
  constructor({ pool, eventBus, infrastructureActivationService, productionIntelligenceService, distributedExecutionService, workerSupervisorService }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.infrastructureActivationService = infrastructureActivationService;
    this.productionIntelligenceService = productionIntelligenceService;
    this.distributedExecutionService = distributedExecutionService;
    this.workerSupervisorService = workerSupervisorService;
  }

  async status({ workspaceId }) {
    const [infrastructure, workers, queues, events] = await Promise.all([
      this.infrastructureActivationService.status({ workspaceId }),
      this.workerSupervisorService.workers({ workspaceId }).catch((error) => ({ status: "blocked", error: error.message, nodes: [] })),
      this.workerSupervisorService.queues({ workspaceId }).catch((error) => ({ status: "blocked", error: error.message })),
      this.#safeQuery("select * from runtime_recovery_events where workspace_id = $1 order by created_at desc limit 30", [workspaceId]),
    ]);
    return {
      status: infrastructure.diagnostics.status === "ready" && queues.status === "ready" ? "ready" : "recovery_guarded",
      infrastructure,
      workers,
      queues,
      events,
      failover: this.#failoverPlan({ infrastructure, workers, queues }),
    };
  }

  async recover({ workspaceId, userId, recoveryType = "runtime" }) {
    const before = await this.status({ workspaceId });
    const actions = [];
    const infra = await this.infrastructureActivationService.recover({ workspaceId, userId, runMigrations: false });
    actions.push({ name: "infrastructure.recover", status: infra.status, detail: infra.recovery?.actions || [] });
    try {
      const distributed = await this.distributedExecutionService.recover({ workspaceId, userId });
      actions.push({ name: "distributed.execution.recover", status: "ok", detail: distributed });
    } catch (error) {
      actions.push({ name: "distributed.execution.recover", status: "blocked", error: error.message });
    }
    const after = await this.status({ workspaceId });
    const status = after.status === "ready" ? "recovered" : "blocked";
    await this.#record({ workspaceId, userId, recoveryType, status, diagnostics: { before: before.infrastructure.diagnostics, after: after.infrastructure.diagnostics }, actions });
    await this.#event({ workspaceId, type: "runtime.recovery.completed", payload: { recoveryType, status, actions } });
    return { status, before, actions, after };
  }

  async failover({ workspaceId, userId, strategy = "conservative" }) {
    const state = await this.status({ workspaceId });
    const plan = this.#failoverPlan(state);
    const status = plan.mode === "normal" ? "not_required" : "guarded";
    await this.#record({ workspaceId, userId, recoveryType: `failover:${strategy}`, status, diagnostics: state.infrastructure.diagnostics, actions: plan.actions });
    await this.#event({ workspaceId, type: "runtime.failover.evaluated", payload: { strategy, status, plan } });
    return { status, strategy, plan, state };
  }

  async recoverStaleExecutions({ workspaceId, userId, dryRun = false }) {
    if (!this.pool) throw new Error("Stale execution recovery requires PostgreSQL DATABASE_URL.");
    const staleAgentMinutes = Number(process.env.AGENT_RUN_STALE_MINUTES || 15);
    const staleBrowserMinutes = Number(process.env.BROWSER_SESSION_STALE_MINUTES || 10);
    const staleJobMinutes = Number(process.env.RUNTIME_JOB_STALE_MINUTES || 15);

    const [agents, browsers, jobs] = await Promise.all([
      this.pool.query(
        `select id, objective, status, coalesce(updated_at, created_at) as last_seen_at
         from agent_runs
         where workspace_id = $1
           and status in ('planning', 'running')
           and coalesce(updated_at, created_at) < now() - ($2::text || ' minutes')::interval
         order by coalesce(updated_at, created_at) asc
         limit 100`,
        [workspaceId, String(staleAgentMinutes)]
      ),
      this.pool.query(
        `select id, current_url, status, coalesce(updated_at, created_at) as last_seen_at
         from browser_sessions
         where workspace_id = $1
           and status = 'running'
           and coalesce(updated_at, created_at) < now() - ($2::text || ' minutes')::interval
         order by coalesce(updated_at, created_at) asc
         limit 100`,
        [workspaceId, String(staleBrowserMinutes)]
      ),
      this.pool.query(
        `select id, queue_name, kind, status, coalesce(updated_at, created_at) as last_seen_at
         from jobs
         where workspace_id = $1
           and status in ('queued', 'running', 'active', 'waiting')
           and coalesce(updated_at, created_at) < now() - ($2::text || ' minutes')::interval
         order by coalesce(updated_at, created_at) asc
         limit 100`,
        [workspaceId, String(staleJobMinutes)]
      ),
    ]);

    const candidates = {
      agents: agents.rows,
      browserSessions: browsers.rows,
      jobs: jobs.rows,
    };

    if (!dryRun) {
      await this.pool.query(
        `update agent_runs
         set status = 'failed',
             error = jsonb_build_object('message', 'Agent run exceeded recovery window and was marked failed by stale execution recovery.', 'recoveredAt', now()),
             updated_at = now(),
             completed_at = now()
         where workspace_id = $1
           and status in ('planning', 'running')
           and coalesce(updated_at, created_at) < now() - ($2::text || ' minutes')::interval`,
        [workspaceId, String(staleAgentMinutes)]
      );
      await this.pool.query(
        `update browser_sessions
         set status = 'failed',
             navigation_memory = jsonb_build_array(jsonb_build_object('error', 'Browser session exceeded recovery window and was marked failed by stale execution recovery.', 'at', now())),
             updated_at = now(),
             completed_at = now()
         where workspace_id = $1
           and status = 'running'
           and coalesce(updated_at, created_at) < now() - ($2::text || ' minutes')::interval`,
        [workspaceId, String(staleBrowserMinutes)]
      );
      await this.pool.query(
        `update jobs
         set status = 'failed',
             error = jsonb_build_object('message', 'Runtime job exceeded recovery window and was marked failed by stale execution recovery.', 'recoveredAt', now()),
             updated_at = now(),
             completed_at = now()
         where workspace_id = $1
           and status in ('queued', 'running', 'active', 'waiting')
           and coalesce(updated_at, created_at) < now() - ($2::text || ' minutes')::interval`,
        [workspaceId, String(staleJobMinutes)]
      );
    }

    const actions = [
      { name: "agent_runs.stale_recovery", status: dryRun ? "dry_run" : "applied", count: candidates.agents.length },
      { name: "browser_sessions.stale_recovery", status: dryRun ? "dry_run" : "applied", count: candidates.browserSessions.length },
      { name: "jobs.stale_recovery", status: dryRun ? "dry_run" : "applied", count: candidates.jobs.length },
    ];
    const status = candidates.agents.length || candidates.browserSessions.length || candidates.jobs.length ? dryRun ? "pending" : "recovered" : "clear";
    await this.#record({ workspaceId, userId, recoveryType: "stale_executions", status, diagnostics: candidates, actions });
    await this.#event({ workspaceId, type: "runtime.recovery.stale_executions", payload: { status, dryRun, actions } });
    return { status, dryRun, thresholds: { staleAgentMinutes, staleBrowserMinutes, staleJobMinutes }, candidates, actions };
  }

  #failoverPlan({ infrastructure, workers, queues }) {
    const actions = [];
    if (infrastructure?.diagnostics?.checks?.postgres?.status !== "ok") actions.push({ action: "block_durable_writes", reason: "PostgreSQL is unavailable." });
    if (queues?.redis?.status !== "ok") actions.push({ action: "disable_queue_dispatch", reason: "Redis is unavailable." });
    if (!workers?.nodes?.some((node) => node.status === "online")) actions.push({ action: "manual_worker_registration_required", reason: "No online runtime workers are registered." });
    return { mode: actions.length ? "degraded_guarded" : "normal", actions };
  }

  async #record({ workspaceId, userId, recoveryType, status, diagnostics, actions }) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `insert into runtime_recovery_events (id, workspace_id, recovery_type, status, diagnostics, actions, created_by, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())`,
        [randomUUID(), workspaceId, recoveryType, status, diagnostics, JSON.stringify(actions), userId || null]
      );
    } catch {
      // Persistence is reported through status diagnostics; recovery must remain callable in degraded mode.
    }
  }

  async #safeQuery(sql, params = []) {
    if (!this.pool) return [];
    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch {
      return [];
    }
  }

  async #event({ workspaceId, type, payload }) {
    await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type, payload });
  }
}
