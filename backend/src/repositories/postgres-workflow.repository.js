import { randomUUID } from "node:crypto";

export class PostgresWorkflowRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async saveDefinition({ id = randomUUID(), workspaceId, projectId, name, definition, createdBy }) {
    if (!this.pool) throw new Error("Workflow persistence requires PostgreSQL DATABASE_URL.");
    await this.pool.query(
      `insert into saved_workflows (id, workspace_id, project_id, name, definition, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, now(), now())
       on conflict (id) do update set name = excluded.name, definition = excluded.definition, updated_at = now()`,
      [id, workspaceId, projectId || null, name, definition, createdBy || null]
    );
    return this.getDefinition({ id, workspaceId });
  }

  async listDefinitions({ workspaceId, limit = 30 }) {
    if (!this.pool) throw new Error("Workflow persistence requires PostgreSQL DATABASE_URL.");
    const result = await this.pool.query(
      `select id, workspace_id, project_id, name, definition, created_by, created_at, updated_at
       from saved_workflows where workspace_id = $1 order by updated_at desc nulls last, created_at desc limit $2`,
      [workspaceId, limit]
    );
    return result.rows;
  }

  async getDefinition({ id, workspaceId }) {
    if (!this.pool) throw new Error("Workflow persistence requires PostgreSQL DATABASE_URL.");
    const result = await this.pool.query("select * from saved_workflows where id = $1 and workspace_id = $2", [id, workspaceId]);
    return result.rows[0];
  }

  async createRun({ definitionId, workspaceId, projectId, status, steps }) {
    if (!this.pool) throw new Error("Workflow runs require PostgreSQL DATABASE_URL.");
    const id = randomUUID();
    await this.pool.query(
      `insert into workflow_runs (id, definition_id, workspace_id, project_id, status, steps, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, now(), now())`,
      [id, definitionId, workspaceId, projectId || null, status, steps]
    );
    return { id, definitionId, workspaceId, projectId, status, steps };
  }

  async getRun(runId) {
    if (!this.pool) throw new Error("Workflow runs require PostgreSQL DATABASE_URL.");
    const result = await this.pool.query("select * from workflow_runs where id = $1", [runId]);
    return result.rows[0];
  }

  async markStepRunning(runId, stepId) {
    return this.#updateStep(runId, stepId, { status: "running", startedAt: new Date().toISOString() });
  }

  async markStepCompleted(runId, stepId, result) {
    return this.#updateStep(runId, stepId, { status: "completed", result, completedAt: new Date().toISOString() });
  }

  async markFailed(runId, error) {
    await this.pool.query("update workflow_runs set status = 'failed', error = $2, updated_at = now(), completed_at = now() where id = $1", [runId, error]);
  }

  async markCompleted(runId) {
    await this.pool.query("update workflow_runs set status = 'completed', updated_at = now(), completed_at = now() where id = $1", [runId]);
  }

  async #updateStep(runId, stepId, patch) {
    const run = await this.getRun(runId);
    const steps = (run.steps || []).map((step) => step.id === stepId ? { ...step, ...patch } : step);
    await this.pool.query("update workflow_runs set steps = $2, updated_at = now() where id = $1", [runId, steps]);
    return { ...run, steps };
  }
}
