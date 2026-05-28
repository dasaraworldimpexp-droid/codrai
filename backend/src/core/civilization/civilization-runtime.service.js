import { randomUUID } from "node:crypto";

export class CivilizationRuntimeService {
  constructor({
    pool,
    eventBus,
    swarmRuntimeService,
    distributedExecutionService,
    selfImprovementEngine,
    dynamicToolService,
    cloudDeploymentService,
    runtimeTelemetryService,
  }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.swarmRuntimeService = swarmRuntimeService;
    this.distributedExecutionService = distributedExecutionService;
    this.selfImprovementEngine = selfImprovementEngine;
    this.dynamicToolService = dynamicToolService;
    this.cloudDeploymentService = cloudDeploymentService;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async createIdentity({ workspaceId, clusterId, userId, agentName, role, personality = {}, capabilities = [] }) {
    if (!this.pool) throw new Error("Civilization runtime requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !agentName || !role) throw new Error("workspaceId, agentName, and role are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into civilization_agent_identities
       (id, workspace_id, cluster_id, agent_name, role, personality, capabilities, memory_state, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, '{}'::jsonb, $8, now(), now())
       on conflict (workspace_id, agent_name) do update set
         role = excluded.role,
         personality = excluded.personality,
         capabilities = excluded.capabilities,
         status = 'active',
         updated_at = now()`,
      [id, workspaceId, clusterId || null, agentName, role, personality, capabilities, userId || null]
    );
    await this.#lineage({ workspaceId, clusterId, sourceType: "agent", sourceId: agentName, eventType: "agent.identity.upserted", payload: { role, capabilities } });
    await this.#event({ workspaceId, clusterId, type: "civilization.agent.identity.upserted", payload: { agentName, role } });
    return this.identities({ workspaceId });
  }

  async learn({ workspaceId, clusterId, agentId, memoryType = "strategy", content, evidence = {}, score = 0.7 }) {
    if (!workspaceId || !content) throw new Error("workspaceId and content are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into civilization_learning_memories
       (id, workspace_id, agent_id, cluster_id, memory_type, content, evidence, score, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [id, workspaceId, agentId || null, clusterId || null, memoryType, content, evidence, Number(score)]
    );
    await this.#cognitionEdge({ workspaceId, clusterId, sourceType: "memory", sourceId: id, targetType: "cluster", targetId: clusterId || workspaceId, relation: "informs", weight: score });
    await this.#event({ workspaceId, clusterId, type: "civilization.memory.learned", payload: { memoryId: id, memoryType, score } });
    return { id, memoryType, score: Number(score) };
  }

  async planStrategy({ workspaceId, clusterId, userId, goal }) {
    if (!workspaceId || !goal) throw new Error("workspaceId and goal are required.");
    const memories = await this.learningMemories({ workspaceId, clusterId, limit: 10 });
    const diagnostics = await this.diagnostics({ workspaceId, clusterId, persist: false });
    const plan = {
      goal,
      stages: [
        { name: "stabilize", actions: ["run diagnostics", "recover stale swarm work", "snapshot critical state"] },
        { name: "expand", actions: ["federate high-priority tasks", "negotiate new capabilities", "replicate useful replay memory"] },
        { name: "optimize", actions: ["score outcomes", "record learning memory", "update governance policy"] },
      ],
      memorySignals: memories.memories.slice(0, 5).map((memory) => ({ id: memory.id, score: memory.score, type: memory.memory_type })),
      diagnostics: diagnostics.status,
      generatedAt: new Date().toISOString(),
    };
    const id = randomUUID();
    await this.pool.query(
      `insert into civilization_strategy_plans
       (id, workspace_id, cluster_id, goal, status, plan, generated_by, created_at, updated_at)
       values ($1, $2, $3, $4, 'active', $5, $6, now(), now())`,
      [id, workspaceId, clusterId || null, goal, plan, userId || null]
    );
    await this.#event({ workspaceId, clusterId, type: "civilization.strategy.planned", payload: { planId: id, goal } });
    return { id, plan };
  }

  async evolve({ workspaceId, clusterId, userId, goal = "Improve autonomous runtime quality, reliability, and cost efficiency." }) {
    const runId = randomUUID();
    await this.pool.query(
      `insert into civilization_evolution_runs
       (id, workspace_id, cluster_id, run_type, status, inputs, created_by, created_at)
       values ($1, $2, $3, 'recursive_optimization', 'running', $4, $5, now())`,
      [runId, workspaceId, clusterId || null, { goal }, userId || null]
    );
    await this.#event({ workspaceId, clusterId, type: "civilization.evolution.started", payload: { runId, goal } });

    const [improvement, swarmOptimization, strategy] = await Promise.all([
      this.selfImprovementEngine.analyze({ workspaceId, userId, scope: { source: "civilization_evolution", clusterId } }),
      clusterId ? this.swarmRuntimeService.optimizeCluster({ workspaceId, clusterId }) : Promise.resolve({ recommendation: "no_cluster_selected" }),
      this.planStrategy({ workspaceId, clusterId, userId, goal }),
    ]);
    const learning = await this.learn({
      workspaceId,
      clusterId,
      memoryType: "optimization",
      content: `Evolution run ${runId} produced strategy ${strategy.id} and swarm recommendation ${swarmOptimization.recommendation}.`,
      evidence: { improvementRunId: improvement.id, strategyId: strategy.id, swarmOptimization },
      score: 0.82,
    });
    const outputs = { improvementRunId: improvement.id, swarmOptimization, strategyId: strategy.id, learning };
    await this.pool.query(
      "update civilization_evolution_runs set status = 'completed', outputs = $3, completed_at = now() where id = $1 and workspace_id = $2",
      [runId, workspaceId, outputs]
    );
    await this.#economy({ workspaceId, clusterId, actorId: "civilization-engine", entryType: "credit_debit", credits: -1, reason: "Recursive optimization run", metadata: { runId } });
    await this.#event({ workspaceId, clusterId, type: "civilization.evolution.completed", payload: { runId, outputs } });
    return this.getEvolutionRun({ workspaceId, runId });
  }

  async synthesizeTool({ workspaceId, clusterId, userId, name, url, description }) {
    const tool = await this.dynamicToolService.create({
      workspaceId,
      userId,
      name,
      kind: "api_request",
      description: description || `Civilization synthesized API tool for ${url}`,
      configuration: { url, method: "GET" },
      permissions: ["network"],
    });
    await this.learn({
      workspaceId,
      clusterId,
      memoryType: "capability",
      content: `Synthesized tool ${tool.name} for URL ${url}.`,
      evidence: { toolName: tool.name, url },
      score: 0.76,
    });
    await this.#event({ workspaceId, clusterId, type: "civilization.capability.synthesized", payload: { toolName: tool.name, url } });
    return { tool };
  }

  async generateMission({ workspaceId, clusterId, userId, title, objective, priority = 7 }) {
    const goalId = randomUUID();
    await this.pool.query(
      `insert into civilization_goals
       (id, workspace_id, cluster_id, title, objective, priority, status, metrics, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, 'active', '{}'::jsonb, now(), now())`,
      [goalId, workspaceId, clusterId || null, title, objective, Number(priority)]
    );
    const task = await this.distributedExecutionService.schedule({
      workspaceId,
      userId,
      source: "civilization_goal",
      taskType: "telemetry_record",
      requiredCapability: "telemetry_record",
      priority,
      payload: { metric: "civilization.goal.generated", value: 1, unit: "goal", metadata: { goalId, title } },
    });
    await this.#cognitionEdge({ workspaceId, clusterId, sourceType: "goal", sourceId: goalId, targetType: "task", targetId: task.id, relation: "spawns", weight: 0.9 });
    await this.#event({ workspaceId, clusterId, type: "civilization.mission.generated", payload: { goalId, taskId: task.id } });
    return { goalId, task };
  }

  async proposePolicy({ workspaceId, clusterId, userId, title, policy }) {
    const consensus = clusterId
      ? await this.swarmRuntimeService.proposeConsensus({ workspaceId, clusterId, userId, proposal: `Adopt governance policy: ${title}` })
      : { rounds: [] };
    const id = randomUUID();
    await this.pool.query(
      `insert into civilization_governance_policies
       (id, workspace_id, cluster_id, title, policy, status, consensus_ref, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'proposed', $6, $7, now(), now())`,
      [id, workspaceId, clusterId || null, title, policy, consensus.rounds?.[0]?.id || null, userId || null]
    );
    await this.#event({ workspaceId, clusterId, type: "civilization.governance.policy_proposed", payload: { policyId: id, title } });
    return { id, consensus };
  }

  async allocateResources({ workspaceId, clusterId, actorId, credits, reason, metadata = {} }) {
    const entry = await this.#economy({ workspaceId, clusterId, actorId, entryType: credits >= 0 ? "credit_grant" : "credit_debit", credits, reason, metadata });
    await this.#event({ workspaceId, clusterId, type: "civilization.economy.allocated", payload: entry });
    return entry;
  }

  async diagnostics({ workspaceId, clusterId, persist = true }) {
    const [swarmAnalytics, executionAnalytics, identities, economy] = await Promise.all([
      clusterId ? this.swarmRuntimeService.analytics({ workspaceId, clusterId }) : Promise.resolve({ queuedTasks: 0, runningTasks: 0, avgHealth: 0, heatmap: [] }),
      this.distributedExecutionService.analytics({ workspaceId }),
      this.identities({ workspaceId }),
      this.economy({ workspaceId }),
    ]);
    const findings = [];
    if (swarmAnalytics.avgHealth < 0.5 && clusterId) findings.push({ severity: "high", message: "Swarm average health is low.", metric: swarmAnalytics.avgHealth });
    if ((swarmAnalytics.queuedTasks || 0) > 5) findings.push({ severity: "medium", message: "Queued swarm work is accumulating.", metric: swarmAnalytics.queuedTasks });
    if ((identities.identities || []).length === 0) findings.push({ severity: "medium", message: "No persistent AGI identities exist." });
    const balance = economy.balance || 0;
    if (balance < -25) findings.push({ severity: "medium", message: "Execution economy balance is negative.", metric: balance });
    const recommendations = findings.map((finding) => ({ action: "review", reason: finding.message }));
    const status = findings.some((finding) => finding.severity === "high") ? "degraded" : findings.length ? "watch" : "healthy";
    if (persist) {
      const id = randomUUID();
      await this.pool.query(
        "insert into civilization_diagnostics (id, workspace_id, cluster_id, status, findings, recommendations, created_at) values ($1, $2, $3, $4, $5, $6, now())",
        [id, workspaceId, clusterId || null, status, findings, recommendations]
      );
      await this.#event({ workspaceId, clusterId, type: "civilization.diagnostics.completed", payload: { id, status, findings: findings.length } });
    }
    return { status, findings, recommendations, swarmAnalytics, executionAnalytics };
  }

  async predictiveScaling({ workspaceId, clusterId }) {
    const diagnostics = await this.diagnostics({ workspaceId, clusterId, persist: false });
    const decision = await this.distributedExecutionService.scaling({ workspaceId });
    const prediction = {
      action: diagnostics.swarmAnalytics.queuedTasks > 8 ? "pre_scale_out" : decision.decision,
      confidence: diagnostics.status === "healthy" ? 0.7 : 0.86,
      reason: diagnostics.findings[0]?.message || decision.reason,
      generatedAt: new Date().toISOString(),
    };
    await this.#event({ workspaceId, clusterId, type: "civilization.scaling.predicted", payload: prediction });
    return prediction;
  }

  async topology({ workspaceId, clusterId }) {
    const [identities, memories, edges, goals, policies, runs] = await Promise.all([
      this.identities({ workspaceId }),
      this.learningMemories({ workspaceId, clusterId, limit: 20 }),
      this.cognitionGraph({ workspaceId, clusterId }),
      this.goals({ workspaceId, clusterId }),
      this.policies({ workspaceId, clusterId }),
      this.evolutionRuns({ workspaceId, clusterId }),
    ]);
    return { identities: identities.identities, memories: memories.memories, edges: edges.edges, goals: goals.goals, policies: policies.policies, runs: runs.runs };
  }

  async identities({ workspaceId }) {
    const result = await this.pool.query("select * from civilization_agent_identities where workspace_id = $1 order by reputation_score desc, created_at desc", [workspaceId]);
    return { identities: result.rows };
  }

  async learningMemories({ workspaceId, clusterId, limit = 30 }) {
    const result = await this.pool.query(
      `select * from civilization_learning_memories
       where workspace_id = $1 and ($2::text is null or cluster_id = $2)
       order by score desc, created_at desc limit $3`,
      [workspaceId, clusterId || null, limit]
    );
    return { memories: result.rows };
  }

  async cognitionGraph({ workspaceId, clusterId }) {
    const result = await this.pool.query(
      `select * from civilization_cognition_edges
       where workspace_id = $1 and ($2::text is null or cluster_id = $2)
       order by weight desc, created_at desc limit 200`,
      [workspaceId, clusterId || null]
    );
    return { edges: result.rows };
  }

  async goals({ workspaceId, clusterId }) {
    const result = await this.pool.query(
      `select * from civilization_goals where workspace_id = $1 and ($2::text is null or cluster_id = $2) order by priority desc, created_at desc limit 40`,
      [workspaceId, clusterId || null]
    );
    return { goals: result.rows };
  }

  async policies({ workspaceId, clusterId }) {
    const result = await this.pool.query(
      `select * from civilization_governance_policies where workspace_id = $1 and ($2::text is null or cluster_id = $2) order by created_at desc limit 30`,
      [workspaceId, clusterId || null]
    );
    return { policies: result.rows };
  }

  async economy({ workspaceId, clusterId }) {
    const result = await this.pool.query(
      `select * from civilization_economy_ledger where workspace_id = $1 and ($2::text is null or cluster_id = $2) order by created_at desc limit 50`,
      [workspaceId, clusterId || null]
    );
    const balance = result.rows.reduce((sum, row) => sum + Number(row.credits || 0), 0);
    return { balance, entries: result.rows };
  }

  async evolutionRuns({ workspaceId, clusterId }) {
    const result = await this.pool.query(
      `select * from civilization_evolution_runs where workspace_id = $1 and ($2::text is null or cluster_id = $2) order by created_at desc limit 30`,
      [workspaceId, clusterId || null]
    );
    return { runs: result.rows };
  }

  async getEvolutionRun({ workspaceId, runId }) {
    const result = await this.pool.query("select * from civilization_evolution_runs where id = $1 and workspace_id = $2", [runId, workspaceId]);
    if (!result.rows[0]) throw new Error("Civilization evolution run not found.");
    return result.rows[0];
  }

  async #economy({ workspaceId, clusterId, actorId, entryType, credits, reason, metadata = {} }) {
    const entry = { id: randomUUID(), workspaceId, clusterId: clusterId || null, actorId: actorId || null, entryType, credits: Number(credits), reason, metadata };
    await this.pool.query(
      `insert into civilization_economy_ledger
       (id, workspace_id, cluster_id, actor_id, entry_type, credits, reason, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [entry.id, workspaceId, clusterId || null, actorId || null, entryType, Number(credits), reason, metadata]
    );
    return entry;
  }

  async #cognitionEdge({ workspaceId, clusterId, sourceType, sourceId, targetType, targetId, relation, weight = 1, metadata = {} }) {
    await this.pool.query(
      `insert into civilization_cognition_edges
       (id, workspace_id, cluster_id, source_type, source_id, target_type, target_id, relation, weight, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      [randomUUID(), workspaceId, clusterId || null, sourceType, sourceId, targetType, targetId, relation, Number(weight), metadata]
    );
  }

  async #lineage({ workspaceId, clusterId, sourceType, sourceId, eventType, payload = {} }) {
    await this.pool.query(
      `insert into civilization_lineage_events
       (id, workspace_id, cluster_id, source_type, source_id, event_type, payload, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [randomUUID(), workspaceId, clusterId || null, sourceType, sourceId, eventType, payload]
    );
  }

  #event({ workspaceId, clusterId, type, payload = {} }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, payload: { clusterId, ...payload } });
  }
}
