export class PostgresEventRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async append(event) {
    if (!this.pool) return null;
    await this.pool.query(
      `insert into realtime_events (id, workspace_id, project_id, channel, type, actor_id, payload, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [event.id, event.workspaceId, event.projectId || null, event.channel, event.type, event.actorId || null, event.payload, event.createdAt]
    );
    return event;
  }
}
