import { randomUUID } from "node:crypto";

export class CloudDeploymentService {
  constructor({ pool, toolExecutionEngine, eventBus }) {
    this.pool = pool;
    this.toolExecutionEngine = toolExecutionEngine;
    this.eventBus = eventBus;
  }

  async createPlan({ workspaceId, projectId, userId, target }) {
    if (!this.pool) throw new Error("Cloud deployment requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !projectId || !target) throw new Error("workspaceId, projectId, and target are required.");
    const id = randomUUID();
    const plan = this.#planForTarget({ target, projectId });
    const generatedFiles = this.#filesForTarget({ target, projectId });
    await this.pool.query(
      `insert into deployment_plans
       (id, workspace_id, project_id, user_id, target, status, plan, generated_files, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'planned', $6, $7, now(), now())`,
      [id, workspaceId, projectId, userId || null, target, plan, generatedFiles]
    );
    await this.#persistFiles({ workspaceId, projectId, generatedFiles });
    await this.#event({ workspaceId, projectId, userId, type: "deployment.plan.created", payload: { planId: id, target } });
    return this.get({ workspaceId, id });
  }

  async execute({ workspaceId, planId, userId }) {
    const plan = await this.get({ workspaceId, id: planId });
    const startedAt = Date.now();
    const readiness = this.#localReadiness(plan);
    const result = {
      status: readiness.ready ? "prepared" : "blocked",
      mode: "local_lifecycle",
      target: plan.target,
      checks: readiness.checks,
      nextAction: readiness.ready
        ? "Run environment-specific deployment command from the generated deployment files."
        : "Resolve blocked readiness checks before execution.",
      cpuFirst: true,
      latencyMs: Date.now() - startedAt,
    };
    await this.pool.query(
      "update deployment_plans set status = $2, execution_result = $3, completed_at = now(), updated_at = now() where id = $1",
      [planId, readiness.ready ? "prepared" : "blocked", result]
    );
    await this.#event({ workspaceId, projectId: plan.project_id, userId, type: "deployment.plan.executed", payload: { planId, status: result.status, mode: result.mode } });
    return this.get({ workspaceId, id: planId });
  }

  async healthCheck({ workspaceId, planId, userId }) {
    const plan = await this.get({ workspaceId, id: planId });
    const started = Date.now();
    const readiness = this.#localReadiness(plan);
    const result = {
      mode: "local_lifecycle",
      target: plan.target,
      checks: readiness.checks,
      status: readiness.ready ? "healthy" : "degraded",
    };
    const statusCode = readiness.ready ? 200 : 409;
    const status = readiness.ready ? "healthy" : "degraded";
    await this.pool.query(
      `insert into deployment_health_checks
       (id, workspace_id, deployment_plan_id, status, status_code, latency_ms, checked_url, result, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [randomUUID(), workspaceId, planId, status, statusCode, Date.now() - started, "local://deployment-readiness", result]
    );
    await this.#event({ workspaceId, projectId: plan.project_id, userId, type: "deployment.health.checked", payload: { planId, status, statusCode } });
    return this.health({ workspaceId, planId });
  }

  async health({ workspaceId, planId }) {
    const result = await this.pool.query(
      `select h.*
       from deployment_health_checks h
       join deployment_plans p on p.id = h.deployment_plan_id
       where p.workspace_id = $1 and h.deployment_plan_id = $2
       order by h.created_at desc limit 20`,
      [workspaceId, planId]
    );
    return result.rows;
  }

  async createSnapshot({ workspaceId, planId, userId, label = "manual snapshot" }) {
    const plan = await this.get({ workspaceId, id: planId });
    const files = await this.pool.query(
      "select path, content, language, version from project_files where workspace_id = $1 and project_id = $2 order by path asc",
      [workspaceId, plan.project_id]
    );
    const snapshotId = randomUUID();
    await this.pool.query(
      `insert into deployment_snapshots (id, workspace_id, deployment_plan_id, project_id, label, snapshot, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [snapshotId, workspaceId, planId, plan.project_id, label, { files: files.rows }, userId || null]
    );
    await this.#event({ workspaceId, projectId: plan.project_id, userId, type: "deployment.snapshot.created", payload: { planId, snapshotId, fileCount: files.rows.length } });
    return this.getSnapshot({ workspaceId, snapshotId });
  }

  async listSnapshots({ workspaceId, planId }) {
    const result = await this.pool.query(
      `select s.*
       from deployment_snapshots s
       join deployment_plans p on p.id = s.deployment_plan_id
       where s.workspace_id = $1 and ($2::text is null or s.deployment_plan_id = $2)
       order by s.created_at desc limit 30`,
      [workspaceId, planId || null]
    );
    return result.rows;
  }

  async rollback({ workspaceId, planId, snapshotId, userId }) {
    const snapshot = await this.getSnapshot({ workspaceId, snapshotId, planId });
    for (const file of snapshot.snapshot?.files || []) {
      await this.pool.query(
        `insert into project_files (id, workspace_id, project_id, path, content, language, version, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, 1, now(), now())
         on conflict (workspace_id, project_id, path)
         do update set content = excluded.content, language = excluded.language, version = project_files.version + 1, updated_at = now()`,
        [randomUUID(), workspaceId, snapshot.project_id, file.path, file.content, file.language || null]
      );
    }
    await this.pool.query("update deployment_plans set status = 'rolled_back', updated_at = now() where id = $1", [snapshot.deployment_plan_id]);
    await this.#event({ workspaceId, projectId: snapshot.project_id, userId, type: "deployment.rollback.completed", payload: { snapshotId, planId: snapshot.deployment_plan_id } });
    return { status: "rolled_back", snapshotId, restoredFiles: snapshot.snapshot?.files?.length || 0 };
  }

  async getSnapshot({ workspaceId, snapshotId, planId }) {
    const result = await this.pool.query(
      "select * from deployment_snapshots where id = $1 and workspace_id = $2 and ($3::text is null or deployment_plan_id = $3)",
      [snapshotId, workspaceId, planId || null]
    );
    if (!result.rows[0]) throw new Error("Deployment snapshot not found.");
    return result.rows[0];
  }

  async list({ workspaceId, limit = 20 }) {
    const result = await this.pool.query("select * from deployment_plans where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async replayHistory({ workspaceId, limit = 30 }) {
    if (!this.pool) throw new Error("Deployment replay requires PostgreSQL DATABASE_URL.");
    const [plans, snapshots, healthChecks, events] = await Promise.all([
      this.pool.query("select id, project_id, target, status, created_at, updated_at, completed_at from deployment_plans where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]),
      this.pool.query("select id, deployment_plan_id, project_id, label, created_at from deployment_snapshots where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]),
      this.pool.query(
        `select h.id, h.deployment_plan_id, h.status, h.status_code, h.latency_ms, h.checked_url, h.created_at
         from deployment_health_checks h
         join deployment_plans p on p.id = h.deployment_plan_id
         where p.workspace_id = $1
         order by h.created_at desc limit $2`,
        [workspaceId, limit]
      ),
      this.pool.query(
        `select type, payload, created_at
         from realtime_events
         where workspace_id = $1 and type like 'deployment.%'
         order by created_at desc limit $2`,
        [workspaceId, limit]
      ),
    ]);
    const timeline = [
      ...plans.rows.map((item) => ({ kind: "plan", at: item.created_at, label: `${item.target} ${item.status}`, ref: item.id, status: item.status })),
      ...snapshots.rows.map((item) => ({ kind: "snapshot", at: item.created_at, label: item.label, ref: item.id, planId: item.deployment_plan_id, status: "captured" })),
      ...healthChecks.rows.map((item) => ({ kind: "health_check", at: item.created_at, label: item.checked_url, ref: item.id, planId: item.deployment_plan_id, status: item.status, latencyMs: item.latency_ms })),
      ...events.rows.map((item) => ({ kind: "event", at: item.created_at, label: item.type, payload: item.payload, status: "recorded" })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return {
      status: "ready",
      workspaceId,
      generatedAt: new Date().toISOString(),
      plans: plans.rows,
      snapshots: snapshots.rows,
      healthChecks: healthChecks.rows,
      events: events.rows,
      timeline,
    };
  }

  async templates({ workspaceId }) {
    const templates = [
      {
        id: "docker-node",
        name: "Docker Node Service",
        target: "docker",
        profile: "local-production",
        resources: { cpu: "shared", memory: "512m-1g", gpu: "disabled" },
        environment: ["DATABASE_URL", "REDIS_URL", "NODE_ENV=production"],
        steps: ["build", "migrate", "start", "health_check", "snapshot"],
      },
      {
        id: "static-frontend",
        name: "Static Frontend",
        target: "nginx-static",
        profile: "frontend-edge",
        resources: { cpu: "minimal", memory: "128m-256m", gpu: "disabled" },
        environment: ["VITE_API_URL"],
        steps: ["build", "publish_static", "cache_headers", "health_check"],
      },
      {
        id: "cpu-ai-worker",
        name: "CPU AI Worker",
        target: "worker",
        profile: "cpu-first-ai",
        resources: { cpu: "bounded", memory: "1g-2g", gpu: "disabled" },
        environment: ["OLLAMA_BASE_URL", "OLLAMA_MAX_LOADED_MODELS=1", "OLLAMA_NUM_PARALLEL=1"],
        steps: ["register_worker", "queue_health", "runtime_health", "rollback_on_failure"],
      },
    ];
    return {
      status: "ready",
      workspaceId,
      generatedAt: new Date().toISOString(),
      templates,
      policy: {
        gpu: "disabled",
        mode: "cpu_first",
        rollbackSnapshots: true,
        healthChecksRequired: true,
      },
    };
  }

  async get({ workspaceId, id }) {
    const result = await this.pool.query("select * from deployment_plans where id = $1 and workspace_id = $2", [id, workspaceId]);
    if (!result.rows[0]) throw new Error("Deployment plan not found.");
    return result.rows[0];
  }

  async #persistFiles({ workspaceId, projectId, generatedFiles }) {
    for (const file of generatedFiles) {
      await this.pool.query(
        `insert into project_files (id, workspace_id, project_id, path, content, language, version, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, 1, now(), now())
         on conflict (workspace_id, project_id, path)
         do update set content = excluded.content, language = excluded.language, version = project_files.version + 1, updated_at = now()`,
        [randomUUID(), workspaceId, projectId, file.path, file.content, file.language || null]
      );
    }
  }

  #planForTarget({ target, projectId }) {
    return {
      target,
      projectId,
      validationUrl: "https://api.github.com",
      steps: ["build", "validate_env", "deploy", "health_check", "monitor"],
      rollback: "redeploy previous artifact from project_versions",
    };
  }

  #filesForTarget({ target, projectId }) {
    const targetLower = target.toLowerCase();
    const dockerfile = {
      path: "Dockerfile",
      language: "dockerfile",
      content: "FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nRUN npm run build --if-present\nCMD [\"npm\", \"start\"]\n",
    };
    const ci = {
      path: ".github/workflows/deploy.yml",
      language: "yaml",
      content: `name: CODRAI Deploy\non:\n  workflow_dispatch:\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm install\n      - run: npm run build --if-present\n`,
    };
    const platform = {
      path: `deploy/${targetLower}.json`,
      language: "json",
      content: JSON.stringify({ projectId, target, generatedBy: "CODRAI", env: ["DATABASE_URL", "OPENAI_API_KEY"] }, null, 2),
    };
    return [dockerfile, ci, platform];
  }

  #localReadiness(plan) {
    const generatedFiles = Array.isArray(plan.generated_files) ? plan.generated_files : [];
    const paths = new Set(generatedFiles.map((file) => file.path));
    const checks = [
      {
        name: "generated_files",
        status: generatedFiles.length > 0 ? "ok" : "blocked",
        detail: `${generatedFiles.length} generated deployment file(s) available.`,
      },
      {
        name: "dockerfile",
        status: paths.has("Dockerfile") ? "ok" : "blocked",
        detail: paths.has("Dockerfile") ? "Dockerfile generated." : "Dockerfile missing.",
      },
      {
        name: "rollback_policy",
        status: plan.plan?.rollback ? "ok" : "blocked",
        detail: plan.plan?.rollback || "Rollback policy missing.",
      },
      {
        name: "cpu_first_policy",
        status: "ok",
        detail: "GPU deployment is disabled by design for this Intel UHD CPU-first runtime.",
      },
    ];
    return {
      ready: checks.every((check) => check.status === "ok"),
      checks,
    };
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
