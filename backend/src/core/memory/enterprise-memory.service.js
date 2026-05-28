import crypto from "node:crypto";

export class EnterpriseMemoryService {
  constructor({ pool, providerRegistry, embeddingRuntime }) {
    this.pool = pool;
    this.providerRegistry = providerRegistry;
    this.embeddingRuntime = embeddingRuntime;
  }

  async search({ workspaceId, projectId, query, limit = 10 }) {
    if (!this.pool) throw new Error("Memory search requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !query) throw new Error("workspaceId and query are required.");

    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
    const [vectorResults, text] = await Promise.all([
      this.#vectorSearch({ workspaceId, projectId, query, limit: safeLimit }),
      this.pool.query(
      `select id, content, metadata, 0.35 as score, 'keyword' as source, created_at
       from ai_memories
       where workspace_id = $1 and ($2::text is null or project_id = $2) and content ilike $3
       order by created_at desc
       limit $4`,
      [workspaceId, projectId || null, `%${query}%`, safeLimit]
      ),
    ]);
    return this.#mergeRanked([...vectorResults, ...text.rows], safeLimit);
  }

  async append({ workspaceId, projectId, userId, content, metadata = {} }) {
    if (!this.pool) throw new Error("Memory append requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !content?.trim()) throw new Error("workspaceId and content are required.");
    const id = crypto.randomUUID();
    const embedding = await this.#embed({ text: content, workspaceId, userId });
    const result = await this.pool.query(
      `insert into ai_memories (id, workspace_id, project_id, user_id, content, metadata, embedding, created_at)
       values ($1, $2, $3, $4, $5, $6, $7::vector, now())
       returning id, content, metadata, embedding is not null as embedded, created_at`,
      [
        id,
        workspaceId,
        projectId || null,
        userId || null,
        content.trim().slice(0, Number(process.env.MEMORY_MAX_CONTENT_CHARS || 6000)),
        { ...metadata, embeddingProvider: embedding.provider, embeddingLatencyMs: embedding.latencyMs },
        this.embeddingRuntime?.vectorLiteral?.(embedding.embedding) || `[${this.#localEmbedding(content).join(",")}]`,
      ]
    );
    return result.rows[0];
  }

  async retrieve(task) {
    if (!task?.workspaceId) return { memories: [], diagnostics: { status: "blocked", reason: "workspaceId_required" } };
    const query = [task.intent, task.input?.text].filter(Boolean).join("\n").trim();
    if (!query) return { memories: [], diagnostics: { status: "empty_query" } };
    const memories = await this.search({
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      query,
      limit: Number(process.env.MEMORY_CONTEXT_LIMIT || 8),
    });
    return {
      memories: memories.map((memory) => ({
        id: memory.id,
        content: memory.content,
        metadata: memory.metadata,
        score: Number(memory.score || 0),
        source: memory.source,
      })),
      diagnostics: {
        status: memories.length > 0 ? "ready" : "empty",
        provider: this.embeddingRuntime?.snapshot?.().lastProvider || "unknown",
        workspaceId: task.workspaceId,
      },
    };
  }

  async retrieveForTask(task) {
    return this.retrieve(task);
  }

  async ragSearch({ workspaceId, projectId, query, limit = 8 }) {
    if (!workspaceId || !query) throw new Error("workspaceId and query are required.");
    const safeLimit = Math.max(1, Math.min(Number(limit) || 8, 30));
    const [memories, files] = await Promise.all([
      this.search({ workspaceId, projectId, query, limit: safeLimit }),
      this.#fileChunkSearch({ workspaceId, projectId, query, limit: safeLimit }),
    ]);
    const sources = this.#mergeRanked([
      ...memories.map((item) => ({ ...item, sourceType: "memory" })),
      ...files.map((item) => ({ ...item, sourceType: "file_chunk" })),
    ], safeLimit);
    return {
      workspaceId,
      query,
      generatedAt: new Date().toISOString(),
      sources: sources.map((source, index) => ({
        rank: index + 1,
        id: source.id,
        sourceType: source.sourceType,
        fileId: source.file_id,
        fileName: source.original_name,
        score: Number(source.score || 0),
        searchMode: source.searchMode || source.source,
        content: source.content,
        metadata: source.metadata || {},
      })),
      diagnostics: {
        retrievalMode: sources.some((source) => source.searchMode === "vector" || source.source === "vector") ? "hybrid_vector_keyword" : "keyword_or_local_vector_fallback",
        embedding: this.embeddingRuntime?.snapshot?.() || null,
      },
    };
  }

  async compressWorkspaceContext({ workspaceId, projectId, conversationId, limit = 40 }) {
    if (!this.pool) throw new Error("Memory compression requires PostgreSQL DATABASE_URL.");
    const source = conversationId
      ? await this.pool.query(
          `select role, content, created_at
           from messages
           where conversation_id = $1 and workspace_id = $2
           order by created_at desc
           limit $3`,
          [conversationId, workspaceId, Math.max(1, Math.min(Number(limit) || 40, 100))]
        )
      : await this.pool.query(
          `select 'memory' as role, content, created_at
           from ai_memories
           where workspace_id = $1 and ($2::text is null or project_id = $2)
           order by created_at desc
           limit $3`,
          [workspaceId, projectId || null, Math.max(1, Math.min(Number(limit) || 40, 100))]
        );
    const ordered = [...source.rows].reverse();
    const summary = ordered
      .map((item) => `${item.role}: ${String(item.content || "").replace(/\s+/g, " ").slice(0, 320)}`)
      .join("\n")
      .slice(0, Number(process.env.MEMORY_COMPRESSED_CONTEXT_CHARS || 6000));
    const memory = await this.append({
      workspaceId,
      projectId,
      content: summary || "No context available to compress.",
      metadata: {
        type: "compressed_context",
        source: conversationId ? "conversation" : "workspace_memory",
        conversationId: conversationId || null,
        sourceItems: source.rows.length,
      },
    });
    return { status: "compressed", sourceItems: source.rows.length, memory };
  }

  async graph({ workspaceId, projectId, limit = 40 }) {
    if (!this.pool) throw new Error("Memory graph requires PostgreSQL DATABASE_URL.");
    if (!workspaceId) throw new Error("workspaceId is required.");
    const safeLimit = Math.max(1, Math.min(Number(limit) || 40, 100));

    const memoryResult = await this.pool.query(
      `select id, content, metadata, created_at
       from ai_memories
       where workspace_id = $1 and ($2::text is null or project_id = $2)
       order by created_at desc
       limit $3`,
      [workspaceId, projectId || null, safeLimit]
    );

    const memoryIds = memoryResult.rows.map((memory) => memory.id);
    const edgeResult = memoryIds.length > 0
      ? await this.pool.query(
          `select id, source_type, source_id, target_type, target_id, relation, weight, metadata, created_at
           from memory_edges
           where workspace_id = $1
             and (
               (source_type = 'memory' and source_id = any($2::text[]))
               or (target_type = 'memory' and target_id = any($2::text[]))
             )
           order by created_at desc
           limit $3`,
          [workspaceId, memoryIds, safeLimit * 2]
        )
      : { rows: [] };

    return {
      workspaceId,
      generatedAt: new Date().toISOString(),
      nodes: memoryResult.rows.map((memory) => ({
        id: memory.id,
        type: "memory",
        label: memory.metadata?.title || memory.metadata?.source || "memory",
        summary: memory.content.slice(0, 220),
        metadata: memory.metadata || {},
        createdAt: memory.created_at,
      })),
      edges: edgeResult.rows.map((item) => ({
        id: item.id,
        source: `${item.source_type}:${item.source_id}`,
        target: `${item.target_type}:${item.target_id}`,
        relation: item.relation,
        weight: Number(item.weight || 0),
        metadata: item.metadata || {},
        createdAt: item.created_at,
      })),
      summary: {
        nodes: memoryResult.rows.length,
        edges: edgeResult.rows.length,
        source: "postgres-ai_memories",
      },
    };
  }

  async summary({ workspaceId, projectId }) {
    if (!this.pool) throw new Error("Memory summary requires PostgreSQL DATABASE_URL.");
    if (!workspaceId) throw new Error("workspaceId is required.");

    const [totals, byType, browserMemory, agentMemory, recent] = await Promise.all([
      this.pool.query(
        `select count(*)::int as total,
                count(*) filter (where embedding is not null)::int as embedded
         from ai_memories
         where workspace_id = $1 and ($2::text is null or project_id = $2)`,
        [workspaceId, projectId || null]
      ),
      this.pool.query(
        `select coalesce(metadata->>'type', metadata->>'source', 'uncategorized') as type, count(*)::int as count, max(created_at) as last_seen_at
         from ai_memories
         where workspace_id = $1 and ($2::text is null or project_id = $2)
         group by coalesce(metadata->>'type', metadata->>'source', 'uncategorized')
         order by count desc
         limit 16`,
        [workspaceId, projectId || null]
      ),
      this.pool.query(
        `select count(*)::int as total, max(created_at) as last_seen_at
         from ai_memories
         where workspace_id = $1 and ($2::text is null or project_id = $2) and metadata->>'type' = 'browser_session'`,
        [workspaceId, projectId || null]
      ),
      this.pool.query(
        `select count(*)::int as total, max(created_at) as last_seen_at
         from ai_memories
         where workspace_id = $1 and ($2::text is null or project_id = $2) and metadata->>'type' = 'agent_execution'`,
        [workspaceId, projectId || null]
      ),
      this.pool.query(
        `select id, content, metadata, created_at
         from ai_memories
         where workspace_id = $1 and ($2::text is null or project_id = $2)
         order by created_at desc
         limit 8`,
        [workspaceId, projectId || null]
      ),
    ]);

    const total = totals.rows[0]?.total || 0;
    const embedded = totals.rows[0]?.embedded || 0;
    return {
      workspaceId,
      generatedAt: new Date().toISOString(),
      status: total > 0 ? "ready" : "empty",
      totals: {
        total,
        embedded,
        keywordOnly: Math.max(total - embedded, 0),
        vectorCoverage: total > 0 ? Number((embedded / total).toFixed(3)) : 0,
      },
      byType: byType.rows,
      browserMemory: browserMemory.rows[0] || { total: 0 },
      agentMemory: agentMemory.rows[0] || { total: 0 },
      recent: recent.rows.map((memory) => ({
        id: memory.id,
        label: memory.metadata?.title || memory.metadata?.type || memory.metadata?.source || "memory",
        preview: memory.content.slice(0, 180),
        metadata: memory.metadata,
        createdAt: memory.created_at,
      })),
      diagnostics: {
        semanticIndexing: embedded > 0 ? "vector_enabled" : "keyword_only_until_embedding_model_configured",
        graphStorage: "memory_edges_ready",
      },
    };
  }

  async indexMissingEmbeddings({ workspaceId, projectId, limit = 50 }) {
    if (!this.pool) throw new Error("Memory indexing requires PostgreSQL DATABASE_URL.");
    if (!workspaceId) throw new Error("workspaceId is required.");
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
    const result = await this.pool.query(
      `select id, content
       from ai_memories
       where workspace_id = $1 and ($2::text is null or project_id = $2) and embedding is null
       order by created_at asc
       limit $3`,
      [workspaceId, projectId || null, safeLimit]
    );
    for (const memory of result.rows) {
      const embedding = await this.#embed({ text: memory.content, workspaceId });
      await this.pool.query(
        "update ai_memories set embedding = $2::vector, metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb where id = $1",
        [memory.id, this.embeddingRuntime?.vectorLiteral?.(embedding.embedding) || `[${this.#localEmbedding(memory.content).join(",")}]`, { embeddingProvider: embedding.provider, embeddingLatencyMs: embedding.latencyMs }]
      );
    }
    return {
      status: "indexed",
      workspaceId,
      indexed: result.rows.length,
      embeddingProvider: this.embeddingRuntime?.snapshot?.().lastProvider || "codrai_local_hash_embedding_1536",
      generatedAt: new Date().toISOString(),
    };
  }

  async #vectorSearch({ workspaceId, projectId, query, limit }) {
    try {
      const embeddingResult = await this.#embed({ text: query, workspaceId });
      const embedding = this.embeddingRuntime?.vectorLiteral?.(embeddingResult.embedding) || `[${this.#localEmbedding(query).join(",")}]`;
      const result = await this.pool.query(
        `select id, content, metadata, 1 - (embedding <=> $1::vector) as score, 'vector' as source, created_at
         from ai_memories
         where workspace_id = $2 and embedding is not null and ($3::text is null or project_id = $3)
         order by embedding <=> $1::vector
         limit $4`,
        [embedding, workspaceId, projectId || null, limit]
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  async #fileChunkSearch({ workspaceId, projectId, query, limit }) {
    try {
      const embeddingResult = await this.#embed({ text: query, workspaceId });
      const embedding = this.embeddingRuntime?.vectorLiteral?.(embeddingResult.embedding) || `[${this.#localEmbedding(query).join(",")}]`;
      const [vector, keyword] = await Promise.all([
        this.pool.query(
          `select fc.id, fc.file_id, uf.original_name, fc.content, uf.metadata, 1 - (fc.embedding <=> $1::vector) as score, 'vector' as search_mode
           from file_chunks fc
           join uploaded_files uf on uf.id = fc.file_id
           where fc.workspace_id = $2 and fc.embedding is not null and ($3::text is null or fc.project_id = $3)
           order by fc.embedding <=> $1::vector
           limit $4`,
          [embedding, workspaceId, projectId || null, limit]
        ),
        this.pool.query(
          `select fc.id, fc.file_id, uf.original_name, fc.content, uf.metadata, 0.32 as score, 'keyword' as search_mode
           from file_chunks fc
           join uploaded_files uf on uf.id = fc.file_id
           where fc.workspace_id = $1 and ($2::text is null or fc.project_id = $2) and fc.content ilike $3
           order by uf.created_at desc, fc.chunk_index asc
           limit $4`,
          [workspaceId, projectId || null, `%${query}%`, limit]
        ),
      ]);
      return this.#mergeRanked([...vector.rows, ...keyword.rows], limit);
    } catch {
      return [];
    }
  }

  async #embed({ text, workspaceId, userId }) {
    if (this.embeddingRuntime) {
      return this.embeddingRuntime.embed({ text, workspaceId, userId });
    }
    return { provider: "codrai_local_hash_embedding_1536", latencyMs: 0, embedding: this.#localEmbedding(text) };
  }

  #mergeRanked(rows, limit) {
    const seen = new Map();
    for (const row of rows) {
      const id = row.id || `${row.sourceType}:${row.file_id}:${row.content?.slice(0, 40)}`;
      const existing = seen.get(id);
      if (!existing || Number(row.score || 0) > Number(existing.score || 0)) {
        seen.set(id, row);
      }
    }
    return [...seen.values()]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, limit);
  }

  #localEmbedding(text) {
    if (this.embeddingRuntime) return this.embeddingRuntime.localEmbedding(text);
    const vector = new Array(1536).fill(0);
    const tokens = String(text || "").toLowerCase().match(/[a-z0-9_:-]+/g) || [];
    for (const token of tokens.slice(0, 2000)) {
      const hash = crypto.createHash("sha256").update(token).digest();
      const index = hash.readUInt16BE(0) % vector.length;
      const sign = hash[2] % 2 === 0 ? 1 : -1;
      vector[index] += sign * (1 + Math.min(token.length, 24) / 24);
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => Number((value / norm).toFixed(6)));
  }
}
