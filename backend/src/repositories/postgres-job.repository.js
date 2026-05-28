import { randomUUID } from "node:crypto";

export class PostgresJobRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(job) {
    if (!this.pool) {
      throw new Error("Job persistence requires PostgreSQL DATABASE_URL.");
    }

    const id = job.id || randomUUID();
    await this.pool.query(
      `insert into jobs (id, workspace_id, project_id, queue_name, kind, status, payload, idempotency_key, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [id, job.workspaceId, job.projectId || null, job.queueName, job.kind, job.status, job.payload, job.idempotencyKey]
    );
    return { ...job, id };
  }

  async updateStatus(id, status, metadata = {}) {
    if (!this.pool) return null;
    await this.pool.query("update jobs set status = $2, metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb, updated_at = now() where id = $1", [id, status, metadata]);
    return { id, status };
  }

  async complete(id, result) {
    if (!this.pool) return null;
    await this.pool.query("update jobs set status = 'completed', result = $2, completed_at = now() where id = $1", [id, result]);
    return { id, status: "completed", result };
  }

  async fail(id, error) {
    if (!this.pool) return null;
    await this.pool.query("update jobs set status = 'failed', error = $2, completed_at = now() where id = $1", [id, error]);
    return { id, status: "failed", error };
  }
}
