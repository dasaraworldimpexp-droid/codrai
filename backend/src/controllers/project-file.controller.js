import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const archiver = require("archiver");

export async function listProjectFiles(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });
    const result = await pool.query(
      `select id, path, language, version, updated_at
       from project_files
       where workspace_id = $1 and project_id = $2
       order by path asc`,
      [req.query.workspaceId || req.workspace?.id, req.params.projectId]
    );
    return res.status(200).json({ files: result.rows });
  } catch (error) {
    return next(error);
  }
}

export async function getProjectFile(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });
    const result = await pool.query(
      `select id, path, language, version, content, updated_at
       from project_files
       where workspace_id = $1 and project_id = $2 and path = $3`,
      [req.query.workspaceId || req.workspace?.id, req.params.projectId, req.query.path]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "File not found." });
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

export async function exportProject(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });
    const result = await pool.query(
      `select path, content from project_files where workspace_id = $1 and project_id = $2 order by path asc`,
      [req.query.workspaceId || req.workspace?.id, req.params.projectId]
    );
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="codrai-${req.params.projectId}.zip"`);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", next);
    archive.pipe(res);
    for (const file of result.rows) {
      archive.append(file.content, { name: file.path });
    }
    await archive.finalize();
  } catch (error) {
    return next(error);
  }
}
