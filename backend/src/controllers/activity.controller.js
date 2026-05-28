export async function listActivity(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });
    const result = await pool.query(
      `select id, workspace_id, project_id, actor_id, type, title, payload, created_at
       from workspace_activity
       where workspace_id = $1
       order by created_at desc
       limit $2`,
      [req.query.workspaceId || req.workspace?.id, Number(req.query.limit || 100)]
    );
    return res.status(200).json({ activity: result.rows });
  } catch (error) {
    return next(error);
  }
}

export async function recordActivity(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });
    const id = crypto.randomUUID();
    const workspaceId = req.body.workspaceId || req.workspace?.id;
    await pool.query(
      `insert into workspace_activity (id, workspace_id, project_id, actor_id, type, title, payload, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [id, workspaceId, req.body.projectId || null, req.user?.id || req.body.actorId || null, req.body.type, req.body.title, req.body.payload || {}]
    );
    await req.app.locals.eventBus?.publish?.({
      type: "workspace.activity.created",
      channel: `workspace:${workspaceId}`,
      workspaceId,
      projectId: req.body.projectId,
      actorId: req.user?.id || req.body.actorId,
      payload: { id, title: req.body.title },
    });
    return res.status(201).json({ id });
  } catch (error) {
    return next(error);
  }
}
