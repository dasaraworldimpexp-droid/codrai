import { randomUUID } from "node:crypto";

export class DistributedExecutionService {
  constructor({
    pool,
    eventBus,
    distributedRuntimeService,
    internetExecutionService,
    missionControlService,
    cloudDeploymentService,
    toolExecutionEngine,
    runtimeTelemetryService,
  }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.distributedRuntimeService = distributedRuntimeService;
    this.internetExecutionService = internetExecutionService;
    this.missionControlService = missionControlService;
    this.cloudDeploymentService = cloudDeploymentService;
    this.toolExecutionEngine = toolExecutionEngine;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async schedule({
    workspaceId,
    projectId,
    userId,
    source = "command_center",
    taskType,
    requiredCapability,
    priority = 5,
    payload = {},
    resourceLimits = {},
    maxAttempts = 3,
  }) {
    if (!this.pool) throw new Error("Distributed execution requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !taskType) throw new Error("workspaceId and taskType are required.");
    const node = await this.#selectNode({ workspaceId, requiredCapability });
    const id = randomUUID();
    await this.pool.query(
      `insert into distributed_execution_tasks
       (id, workspace_id, project_id, user_id, source, task_type, required_capability, priority, assigned_node_id, status, payload, resource_limits, max_attempts, scheduled_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10, $11, $12, now(), now())`,
      [id, workspaceId, projectId || null, userId || null, source, taskType, requiredCapability || null, Number(priority), node?.id || null, payload, resourceLimits, Number(maxAttempts)]
    );
    await this.#taskEvent({ workspaceId, taskId: id, eventType: "task.scheduled", payload: { assignedNodeId: node?.id || null, taskType, requiredCapability } });
    await this.#recordTelemetry({ workspaceId, nodeId: node?.id, metric: "distributed.tasks.scheduled", value: 1, unit: "task", metadata: { taskType } });
    return this.get({ workspaceId, taskId: id });
  }

  async execute({ workspaceId, taskId, userId }) {
    const task = await this.get({ workspaceId, taskId });
    if (["cancelled", "completed"].includes(task.status)) return task;
    await this.pool.query(
      `update distributed_execution_tasks
       set status = 'running', attempts = attempts + 1, started_at = coalesce(started_at, now()), updated_at = now()
       where id = $1 and workspace_id = $2`,
      [taskId, workspaceId]
    );
    await this.#taskEvent({ workspaceId, taskId, eventType: "task.started", payload: { attempt: Number(task.attempts || 0) + 1, nodeId: task.assigned_node_id } });

    try {
      const result = await this.#executeByType({ task: { ...task, attempts: Number(task.attempts || 0) + 1 }, userId });
      await this.pool.query(
        `update distributed_execution_tasks
         set status = 'completed', result = $3, checkpoint = $4, completed_at = now(), updated_at = now()
         where id = $1 and workspace_id = $2`,
        [taskId, workspaceId, result, { completedAt: new Date().toISOString(), resultType: task.task_type }]
      );
      await this.#taskEvent({ workspaceId, taskId, eventType: "task.completed", payload: { result } });
      await this.#replayMemory({ workspaceId, taskId, replayType: "completion", memory: result });
      await this.#recordTelemetry({ workspaceId, nodeId: task.assigned_node_id, metric: "distributed.tasks.completed", value: 1, unit: "task", metadata: { taskType: task.task_type } });
      return this.get({ workspaceId, taskId });
    } catch (error) {
      return this.#handleFailure({ task, userId, error });
    }
  }

  async command({ workspaceId, taskId, userId, command }) {
    const task = await this.get({ workspaceId, taskId });
    if (command === "cancel") {
      await this.pool.query(
        "update distributed_execution_tasks set status = 'cancelled', checkpoint = checkpoint || $3::jsonb, updated_at = now() where id = $1 and workspace_id = $2",
        [taskId, workspaceId, JSON.stringify({ cancelledBy: userId || null, cancelledAt: new Date().toISOString() })]
      );
      await this.#taskEvent({ workspaceId, taskId, eventType: "task.cancelled", payload: { userId } });
      return this.get({ workspaceId, taskId });
    }
    if (command === "retry") {
      await this.pool.query("update distributed_execution_tasks set status = 'scheduled', error = null, updated_at = now() where id = $1 and workspace_id = $2", [taskId, workspaceId]);
      await this.#taskEvent({ workspaceId, taskId, eventType: "task.retry_requested", payload: { userId } });
      return this.execute({ workspaceId, taskId, userId });
    }
    if (command === "snapshot") {
      return this.snapshot({ workspaceId, taskId, userId, label: "manual command-center snapshot" });
    }
    throw new Error(`Unsupported distributed execution command: ${command}`);
  }

  async recover({ workspaceId, userId }) {
    if (!workspaceId) throw new Error("workspaceId is required.");
    const stale = await this.pool.query(
      `select * from distributed_execution_tasks
       where workspace_id = $1 and status = 'running' and updated_at < now() - interval '5 minutes'
       order by priority desc, scheduled_at asc limit 20`,
      [workspaceId]
    );
    const recovered = [];
    for (const task of stale.rows) {
      await this.pool.query(
        "update distributed_execution_tasks set status = 'scheduled', checkpoint = checkpoint || $3::jsonb, updated_at = now() where id = $1 and workspace_id = $2",
        [task.id, workspaceId, JSON.stringify({ recoveredAt: new Date().toISOString(), reason: "stale-running-task" })]
      );
      await this.#taskEvent({ workspaceId, taskId: task.id, eventType: "task.recovered", payload: { userId, reason: "stale-running-task" } });
      recovered.push(task.id);
    }
    await this.#recordTelemetry({ workspaceId, metric: "distributed.tasks.recovered", value: recovered.length, unit: "task" });
    return { recovered };
  }

  async snapshot({ workspaceId, taskId, userId, label = "execution snapshot" }) {
    const task = await this.get({ workspaceId, taskId });
    const timeline = await this.timeline({ workspaceId, taskId });
    const replay = await this.replay({ workspaceId, taskId });
    const id = randomUUID();
    await this.pool.query(
      `insert into execution_state_snapshots (id, workspace_id, task_id, label, state, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [id, workspaceId, taskId, label, { task, timeline: timeline.events, replay: replay.memories }, userId || null]
    );
    await this.#taskEvent({ workspaceId, taskId, eventType: "task.snapshot.created", payload: { snapshotId: id, label } });
    return { id, taskId, label };
  }

  async list({ workspaceId, status, limit = 50 }) {
    const result = await this.pool.query(
      `select * from distributed_execution_tasks
       where workspace_id = $1 and ($2::text is null or status = $2)
       order by priority desc, scheduled_at desc limit $3`,
      [workspaceId, status || null, limit]
    );
    return result.rows;
  }

  async get({ workspaceId, taskId }) {
    const result = await this.pool.query("select * from distributed_execution_tasks where id = $1 and workspace_id = $2", [taskId, workspaceId]);
    if (!result.rows[0]) throw new Error("Distributed execution task not found.");
    return result.rows[0];
  }

  async timeline({ workspaceId, taskId, limit = 100 }) {
    await this.get({ workspaceId, taskId });
    const result = await this.pool.query(
      "select * from distributed_execution_events where workspace_id = $1 and task_id = $2 order by created_at asc limit $3",
      [workspaceId, taskId, limit]
    );
    return { events: result.rows };
  }

  async replay({ workspaceId, taskId }) {
    await this.get({ workspaceId, taskId });
    const result = await this.pool.query(
      "select * from execution_replay_memories where workspace_id = $1 and task_id = $2 order by created_at desc limit 20",
      [workspaceId, taskId]
    );
    return { memories: result.rows };
  }

  async analytics({ workspaceId }) {
    const summary = await this.pool.query(
      `select status, count(*)::int as count
       from distributed_execution_tasks
       where workspace_id = $1
       group by status
       order by status asc`,
      [workspaceId]
    );
    const latency = await this.pool.query(
      `select task_type,
              count(*)::int as completed,
              avg(extract(epoch from (completed_at - started_at)) * 1000)::int as avg_latency_ms
       from distributed_execution_tasks
       where workspace_id = $1 and status = 'completed' and started_at is not null and completed_at is not null
       group by task_type
       order by completed desc`,
      [workspaceId]
    );
    return { summary: summary.rows, latency: latency.rows };
  }

  async scaling({ workspaceId }) {
    const nodes = await this.distributedRuntimeService.list({ workspaceId });
    const tasks = await this.analytics({ workspaceId });
    const queued = tasks.summary.find((item) => item.status === "scheduled")?.count || 0;
    const online = nodes.filter((node) => node.status === "online").length;
    const avgLoad = nodes.length ? nodes.reduce((sum, node) => sum + Number(node.load_score || 0), 0) / nodes.length : 0;
    const decision = queued > online * 3 || avgLoad > 0.8 ? "scale_out" : online > 1 && queued === 0 && avgLoad < 0.25 ? "scale_in_candidate" : "hold";
    const reason = decision === "scale_out" ? "Queue pressure or runtime load is high." : decision === "scale_in_candidate" ? "Runtime load is low with idle capacity." : "Runtime capacity is balanced.";
    const id = randomUUID();
    const metrics = { queued, online, avgLoad: Number(avgLoad.toFixed(2)) };
    await this.pool.query(
      "insert into runtime_scaling_decisions (id, workspace_id, decision, reason, metrics, created_at) values ($1, $2, $3, $4, $5, now())",
      [id, workspaceId, decision, reason, metrics]
    );
    await this.#event({ workspaceId, type: "runtime.scaling.decision", payload: { decision, reason, metrics } });
    return { id, decision, reason, metrics };
  }

  async #executeByType({ task, userId }) {
    if (task.task_type === "internet_execution") {
      const session = await this.internetExecutionService.start({
        workspaceId: task.workspace_id,
        projectId: task.project_id,
        userId: userId || task.user_id,
        objective: task.payload.objective,
        startUrl: task.payload.startUrl,
      });
      return { internetSessionId: session.id, status: session.status, browserSessionId: session.browser_session_id };
    }
    if (task.task_type === "mission_recovery") {
      const mission = await this.missionControlService.resume({
        workspaceId: task.workspace_id,
        id: task.payload.missionId,
        userId: userId || task.user_id,
      });
      return { missionId: mission.id, status: mission.status };
    }
    if (task.task_type === "deployment_health_check") {
      const checks = await this.cloudDeploymentService.healthCheck({
        workspaceId: task.workspace_id,
        planId: task.payload.planId,
        userId: userId || task.user_id,
      });
      return { checks };
    }
    if (task.task_type === "tool_execution") {
      const result = await this.toolExecutionEngine.execute({
        workspaceId: task.workspace_id,
        projectId: task.project_id,
        userId: userId || task.user_id,
        toolName: task.payload.toolName,
        input: task.payload.input || {},
        mode: task.payload.mode || "sync",
      }, { id: userId || task.user_id });
      return result;
    }
    if (task.task_type === "telemetry_record") {
      return this.runtimeTelemetryService.record({
        workspaceId: task.workspace_id,
        nodeId: task.assigned_node_id,
        metric: task.payload.metric,
        value: task.payload.value,
        unit: task.payload.unit,
        metadata: task.payload.metadata || {},
      });
    }
    throw new Error(`Unsupported distributed task type: ${task.task_type}`);
  }

  async #handleFailure({ task, userId, error }) {
    const attempts = Number(task.attempts || 0) + 1;
    const canRetry = attempts < Number(task.max_attempts || 3);
    const nextStatus = canRetry ? "scheduled" : "failed_isolated";
    await this.pool.query(
      `update distributed_execution_tasks
       set status = $3, error = $4, checkpoint = checkpoint || $5::jsonb, updated_at = now(), completed_at = case when $3 = 'failed_isolated' then now() else completed_at end
       where id = $1 and workspace_id = $2`,
      [
        task.id,
        task.workspace_id,
        nextStatus,
        { message: error.message, stack: error.stack },
        JSON.stringify({ lastFailureAt: new Date().toISOString(), canRetry }),
      ]
    );
    await this.#taskEvent({ workspaceId: task.workspace_id, taskId: task.id, eventType: canRetry ? "task.retry_scheduled" : "task.failure_isolated", payload: { userId, error: error.message, attempts } });
    await this.#replayMemory({ workspaceId: task.workspace_id, taskId: task.id, replayType: "failure", memory: { error: error.message, attempts, canRetry } });
    await this.#recordTelemetry({ workspaceId: task.workspace_id, nodeId: task.assigned_node_id, metric: "distributed.tasks.failed", value: 1, unit: "task", metadata: { taskType: task.task_type, isolated: !canRetry } });
    if (canRetry) return this.execute({ workspaceId: task.workspace_id, taskId: task.id, userId });
    return this.get({ workspaceId: task.workspace_id, taskId: task.id });
  }

  async #selectNode({ workspaceId, requiredCapability }) {
    const nodes = await this.distributedRuntimeService.list({ workspaceId });
    return nodes
      .filter((node) => node.status === "online")
      .filter((node) => !requiredCapability || (node.capabilities || []).includes(requiredCapability))
      .sort((a, b) => Number(b.health_score || 0) - Number(a.health_score || 0) || Number(a.load_score || 0) - Number(b.load_score || 0))[0] || null;
  }

  async #taskEvent({ workspaceId, taskId, eventType, payload = {} }) {
    const id = randomUUID();
    await this.pool.query(
      "insert into distributed_execution_events (id, workspace_id, task_id, event_type, payload, created_at) values ($1, $2, $3, $4, $5, now())",
      [id, workspaceId, taskId, eventType, payload]
    );
    await this.#event({ workspaceId, type: `distributed_execution.${eventType}`, payload: { taskId, ...payload } });
    return { id, eventType };
  }

  async #replayMemory({ workspaceId, taskId, replayType, memory }) {
    await this.pool.query(
      "insert into execution_replay_memories (id, workspace_id, task_id, replay_type, memory, created_at) values ($1, $2, $3, $4, $5, now())",
      [randomUUID(), workspaceId, taskId, replayType, memory]
    );
  }

  async #recordTelemetry({ workspaceId, nodeId, metric, value, unit, metadata = {} }) {
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, nodeId, metric, value, unit, metadata });
    } catch {
      await this.#event({ workspaceId, type: "runtime.telemetry.dropped", payload: { metric, value } });
    }
  }

  #event({ workspaceId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, payload });
  }
}
