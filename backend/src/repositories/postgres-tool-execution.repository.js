export class PostgresToolExecutionRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async save(execution) {
    if (!this.pool) throw new Error("Tool executions require PostgreSQL DATABASE_URL.");
    await this.pool.query(
      `insert into tool_executions (id, workspace_id, project_id, user_id, tool_name, status, input, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [execution.id, execution.workspaceId, execution.projectId || null, execution.userId || null, execution.toolName, execution.status, execution.input || {}]
    );
    return execution;
  }

  async updateStatus(id, status, metadata = {}) {
    if (!this.pool) return null;
    await this.pool.query("update tool_executions set status = $2, updated_at = now(), result = coalesce(result, '{}'::jsonb) || $3::jsonb where id = $1", [id, status, metadata]);
  }

  async complete(id, result) {
    if (!this.pool) return null;
    await this.pool.query("update tool_executions set status = 'completed', result = $2, completed_at = now() where id = $1", [id, result]);
  }

  async fail(id, error) {
    if (!this.pool) return null;
    await this.pool.query("update tool_executions set status = 'failed', error = $2, completed_at = now() where id = $1", [id, error]);
  }

  async getById(id) {
    if (!this.pool) throw new Error("Tool executions require PostgreSQL DATABASE_URL.");
    const result = await this.pool.query("select * from tool_executions where id = $1", [id]);
    return result.rows[0];
  }
}
