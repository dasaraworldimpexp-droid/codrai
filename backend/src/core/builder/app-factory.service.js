import { randomUUID } from "node:crypto";

export class AppFactoryService {
  constructor({ pool, appProjectGenerator, toolExecutionEngine, eventBus }) {
    this.pool = pool;
    this.appProjectGenerator = appProjectGenerator;
    this.toolExecutionEngine = toolExecutionEngine;
    this.eventBus = eventBus;
  }

  async generate({ workspaceId, projectId = randomUUID(), userId, goal }) {
    if (!this.pool) throw new Error("App factory requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !goal?.trim()) throw new Error("workspaceId and goal are required.");
    const runId = randomUUID();
    const architecture = this.#architectureFor(goal);
    await this.pool.query(
      `insert into app_generation_runs
       (id, workspace_id, project_id, user_id, goal, status, architecture, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'generating', $6, now(), now())`,
      [runId, workspaceId, projectId, userId || null, goal, architecture]
    );
    await this.#event({ workspaceId, projectId, userId, type: "app_factory.generation.started", payload: { runId, goal } });

    try {
      const generated = await this.appProjectGenerator.generate({ workspaceId, projectId, userId, goal: this.#generationPrompt(goal, architecture) });
      const dependencyManifest = await this.#dependencyManifest({ workspaceId, projectId });
      const debugReport = await this.#debugProject({ workspaceId, projectId, userId, dependencyManifest });
      const result = { projectId, files: generated.files.length, exportUrl: `/api/projects/${projectId}/export?workspaceId=${workspaceId}` };
      await this.pool.query(
        `update app_generation_runs
         set status = 'completed', dependency_manifest = $2, debug_report = $3, result = $4, completed_at = now(), updated_at = now()
         where id = $1`,
        [runId, dependencyManifest, debugReport, result]
      );
      await this.#event({ workspaceId, projectId, userId, type: "app_factory.generation.completed", payload: { runId, projectId, files: generated.files.length } });
      return this.get({ workspaceId, runId });
    } catch (error) {
      await this.pool.query("update app_generation_runs set status = 'failed', error = $2, completed_at = now(), updated_at = now() where id = $1", [runId, { message: error.message }]);
      await this.#event({ workspaceId, projectId, userId, type: "app_factory.generation.failed", payload: { runId, error: error.message } });
      throw error;
    }
  }

  async list({ workspaceId, limit = 20 }) {
    const result = await this.pool.query("select * from app_generation_runs where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async get({ workspaceId, runId }) {
    const result = await this.pool.query("select * from app_generation_runs where id = $1 and workspace_id = $2", [runId, workspaceId]);
    if (!result.rows[0]) throw new Error("App generation run not found.");
    return result.rows[0];
  }

  #architectureFor(goal) {
    return {
      frontend: "React + Vite + Tailwind",
      backend: "Node.js + Express",
      persistence: "PostgreSQL-ready interfaces",
      requirements: ["routing", "components", "API layer", "environment example", "README", "production build scripts"],
      goal,
    };
  }

  #generationPrompt(goal, architecture) {
    return [
      goal,
      "Create a complete runnable full-stack app with clean folders.",
      "Include frontend and backend package.json files, route files, state/API utilities, env examples, and deployment notes.",
      `Architecture: ${JSON.stringify(architecture)}`,
    ].join("\n");
  }

  async #dependencyManifest({ workspaceId, projectId }) {
    const result = await this.pool.query(
      `select path, content from project_files
       where workspace_id = $1 and project_id = $2 and path like '%package.json'
       order by path asc`,
      [workspaceId, projectId]
    );
    return result.rows.map((file) => {
      try {
        return { path: file.path, package: JSON.parse(file.content) };
      } catch {
        return { path: file.path, parseError: true };
      }
    });
  }

  async #debugProject({ workspaceId, projectId, userId, dependencyManifest }) {
    const fileCount = await this.pool.query("select count(*)::int as count from project_files where workspace_id = $1 and project_id = $2", [workspaceId, projectId]);
    const hasPackageJson = dependencyManifest.length > 0;
    const findings = [];
    if (!hasPackageJson) findings.push("No package.json files were generated.");
    if (fileCount.rows[0].count < 4) findings.push("Generated app has very few files; review architecture completeness.");
    return {
      status: findings.length === 0 ? "passed_static_checks" : "needs_review",
      findings,
      checkedBy: userId || "system",
      checkedAt: new Date().toISOString(),
    };
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
