import { randomUUID } from "node:crypto";

export class FileIndexingService {
  constructor({ pool, embeddingProvider, embeddingRuntime, storageService, textExtractor, chunkingService }) {
    this.pool = pool;
    this.embeddingProvider = embeddingProvider;
    this.embeddingRuntime = embeddingRuntime;
    this.storageService = storageService;
    this.textExtractor = textExtractor;
    this.chunkingService = chunkingService;
  }

  async ingest({ file, workspaceId, projectId, userId }) {
    this.#assertConfigured();
    const fileId = randomUUID();
    const storagePath = await this.storageService.store({ id: fileId, buffer: file.buffer, originalName: file.originalname });
    const extractedText = await this.textExtractor.extract({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    await this.pool.query(
      `insert into uploaded_files (id, workspace_id, project_id, user_id, original_name, mime_type, size_bytes, storage_path, status, extracted_text, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'indexed', $9, now())`,
      [fileId, workspaceId, projectId || null, userId || null, file.originalname, file.mimetype, file.size, storagePath, extractedText]
    );

    const chunks = this.chunkingService.chunk(extractedText);
    for (let index = 0; index < chunks.length; index += 1) {
      const embedding = await this.#embed(chunks[index], { workspaceId, projectId, userId });
      await this.pool.query(
        `insert into file_chunks (id, file_id, workspace_id, project_id, chunk_index, content, embedding, created_at)
         values ($1, $2, $3, $4, $5, $6, $7::vector, now())`,
        [randomUUID(), fileId, workspaceId, projectId || null, index, chunks[index], embedding ? `[${embedding.join(",")}]` : null]
      );
    }

    return {
      fileId,
      originalName: file.originalname,
      chunks: chunks.length,
      extractedTextLength: extractedText.length,
      embeddings: this.embeddingRuntime ? "runtime" : this.embeddingProvider ? "provider" : "blocked",
    };
  }

  async search({ workspaceId, projectId, query, limit = 8 }) {
    this.#assertConfigured();
    const embedding = await this.#embed(query, { workspaceId, projectId });
    if (!embedding) {
      const result = await this.pool.query(
        `select fc.id, fc.file_id, uf.original_name, fc.content, null::numeric as score
         from file_chunks fc
         join uploaded_files uf on uf.id = fc.file_id
         where fc.workspace_id = $1
           and ($2::text is null or fc.project_id = $2)
           and fc.content ilike $3
         order by uf.created_at desc, fc.chunk_index asc
         limit $4`,
        [workspaceId, projectId || null, `%${query}%`, limit]
      );
      return result.rows.map((row) => ({ ...row, searchMode: "text_fallback_no_embedding_provider" }));
    }

    const result = await this.pool.query(
      `select fc.id, fc.file_id, uf.original_name, fc.content, 1 - (fc.embedding <=> $1::vector) as score
       from file_chunks fc
       join uploaded_files uf on uf.id = fc.file_id
       where fc.workspace_id = $2 and ($3::text is null or fc.project_id = $3)
       order by fc.embedding <=> $1::vector
       limit $4`,
      [`[${embedding.join(",")}]`, workspaceId, projectId || null, limit]
    );

    const keyword = await this.pool.query(
      `select fc.id, fc.file_id, uf.original_name, fc.content, 0.32::numeric as score
       from file_chunks fc
       join uploaded_files uf on uf.id = fc.file_id
       where fc.workspace_id = $1
         and ($2::text is null or fc.project_id = $2)
         and fc.content ilike $3
       order by uf.created_at desc, fc.chunk_index asc
       limit $4`,
      [workspaceId, projectId || null, `%${query}%`, limit]
    );

    return this.#mergeRanked([...result.rows.map((row) => ({ ...row, searchMode: "vector" })), ...keyword.rows.map((row) => ({ ...row, searchMode: "keyword" }))], limit);
  }

  async #embed(text, context = {}) {
    if (this.embeddingRuntime) {
      const result = await this.embeddingRuntime.embed({ text, workspaceId: context.workspaceId, userId: context.userId });
      return result.embedding;
    }
    if (!this.embeddingProvider) return null;
    try {
      const result = await this.embeddingProvider.embed({ input: { text } });
      return result.output.embedding;
    } catch {
      return null;
    }
  }

  #mergeRanked(rows, limit) {
    const seen = new Map();
    for (const row of rows) {
      const existing = seen.get(row.id);
      if (!existing || Number(row.score || 0) > Number(existing.score || 0)) seen.set(row.id, row);
    }
    return [...seen.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, limit);
  }

  #assertConfigured() {
    if (!this.pool) throw new Error("File indexing requires PostgreSQL DATABASE_URL.");
  }
}
