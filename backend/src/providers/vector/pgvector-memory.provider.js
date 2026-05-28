export class PgVectorMemoryProvider {
  constructor({ pool, embeddingProvider }) {
    this.pool = pool;
    this.embeddingProvider = embeddingProvider;
  }

  async upsertMemory({ id, workspaceId, userId, projectId, content, metadata = {} }) {
    this.#assertConfigured();
    const embeddingResult = await this.embeddingProvider.embed({ input: { text: content } });
    const embedding = embeddingResult.output.embedding;
    await this.pool.query(
      `insert into ai_memories (id, workspace_id, user_id, project_id, content, metadata, embedding, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (id) do update set content = excluded.content, metadata = excluded.metadata, embedding = excluded.embedding`,
      [id, workspaceId, userId, projectId, content, metadata, `[${embedding.join(",")}]`]
    );
    return { id };
  }

  async search({ workspaceId, userId, projectId, query, limit = 8 }) {
    this.#assertConfigured();
    const embeddingResult = await this.embeddingProvider.embed({ input: { text: query } });
    const embedding = `[${embeddingResult.output.embedding.join(",")}]`;
    const result = await this.pool.query(
      `select id, content, metadata, 1 - (embedding <=> $1::vector) as score
       from ai_memories
       where workspace_id = $2 and ($3::text is null or user_id = $3) and ($4::text is null or project_id = $4)
       order by embedding <=> $1::vector
       limit $5`,
      [embedding, workspaceId, userId || null, projectId || null, limit]
    );
    return result.rows;
  }

  #assertConfigured() {
    if (!this.pool) {
      throw new Error("PgVector memory requires PostgreSQL DATABASE_URL and pgvector schema.");
    }
  }
}
