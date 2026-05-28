export class PostgresConversationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async persistAiResult({ task, result }) {
    if (!this.pool || !task.conversationId) return null;
    await this.pool.query(
      `insert into messages (conversation_id, workspace_id, project_id, role, content, provider, model, usage, created_at)
       values ($1, $2, $3, 'assistant', $4, $5, $6, $7, now())`,
      [
        task.conversationId,
        task.workspaceId,
        task.projectId || null,
        result.output?.text || JSON.stringify(result.output || {}),
        result.provider || null,
        result.model || null,
        result.usage || null,
      ]
    );
    await this.pool.query("update conversations set updated_at = now() where id = $1", [task.conversationId]);
    return result;
  }

  async getRuntimeSummary(conversationId) {
    if (!this.pool || !conversationId) return null;

    const result = await this.pool.query(
      `select role, content, created_at
       from messages
       where conversation_id = $1
       order by created_at desc, id desc
       limit 16`,
      [conversationId]
    );

    return {
      conversationId,
      recentMessages: result.rows.reverse(),
    };
  }
}
