import { randomUUID } from "node:crypto";

export class AppProjectGeneratorService {
  constructor({ pool, aiRuntimeEngine }) {
    this.pool = pool;
    this.aiRuntimeEngine = aiRuntimeEngine;
  }

  async generate({ workspaceId, projectId = randomUUID(), userId, goal }) {
    if (!this.pool) throw new Error("App generation requires PostgreSQL DATABASE_URL.");

    const result = await this.aiRuntimeEngine.execute({
      workspaceId,
      projectId,
      userId,
      taskType: "coding",
      intent: "Generate a production React + Node app file tree as JSON.",
      input: {
        text: [
          "Generate a small production-ready React + Node app for this goal.",
          goal,
          "Return strict JSON only with shape: { files: [{ path, language, content }] }.",
          "Include package.json, frontend React files, backend Express files, and README instructions.",
        ].join("\n"),
      },
      outputContract: { json: true },
      qualityTier: "premium",
    });

    const parsed = this.#parseJson(result.result?.output?.text || result.output?.text || "{}");
    const files = Array.isArray(parsed.files) ? parsed.files : [];

    for (const file of files) {
      await this.pool.query(
        `insert into project_files (id, workspace_id, project_id, path, content, language, version, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, 1, now(), now())
         on conflict (workspace_id, project_id, path)
         do update set content = excluded.content, language = excluded.language, version = project_files.version + 1, updated_at = now()`,
        [randomUUID(), workspaceId, projectId, file.path, file.content, file.language || null]
      );
    }

    await this.pool.query(
      `insert into project_versions (id, workspace_id, project_id, user_id, message, snapshot, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [randomUUID(), workspaceId, projectId, userId || null, `Generated app: ${goal}`, { files }]
    );

    return { projectId, files };
  }

  #parseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      const match = text?.match(/\{[\s\S]*\}/);
      if (!match) return {};
      try {
        return JSON.parse(match[0]);
      } catch {
        return {};
      }
    }
  }
}
