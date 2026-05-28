import { randomUUID } from "node:crypto";

export async function listConversations(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });

    const workspaceId = req.query.workspaceId || req.workspace?.id;
    const search = req.query.search;
    const params = [workspaceId];
    let where = "workspace_id = $1 and archived_at is null";

    if (search) {
      params.push(`%${search}%`);
      where += ` and title ilike $${params.length}`;
    }

    const result = await pool.query(
      `select id, workspace_id, project_id, user_id, title, created_at, updated_at
       from conversations
       where ${where}
       order by coalesce(updated_at, created_at) desc
       limit 50`,
      params
    );

    return res.status(200).json({ conversations: result.rows });
  } catch (error) {
    return next(error);
  }
}

export async function createConversation(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });

    const id = req.body.id || randomUUID();
    const workspaceId = req.body.workspaceId || req.workspace?.id;
    const userId = req.body.userId || req.user?.id;
    const title = req.body.title || "New conversation";

    await pool.query(
      `insert into conversations (id, workspace_id, project_id, user_id, title, created_at, updated_at)
       values ($1, $2, $3, $4, $5, now(), now())`,
      [id, workspaceId, req.body.projectId || null, userId || null, title]
    );

    return res.status(201).json({ id, workspaceId, userId, title });
  } catch (error) {
    return next(error);
  }
}

export async function getConversationMessages(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });

    const workspaceId = req.query.workspaceId || req.workspace?.id;
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const beforeId = req.query.beforeId ? Number(req.query.beforeId) : null;
    const ownership = await pool.query(
      `select id from conversations where id = $1 and ($2::text is null or workspace_id = $2)`,
      [req.params.conversationId, workspaceId || null]
    );
    if (!ownership.rows[0]) return res.status(404).json({ message: "Conversation not found." });

    const result = await pool.query(
      `select id, conversation_id, role, content, provider, model, usage, created_at
       from messages
       where conversation_id = $1 and ($2::bigint is null or id < $2)
       order by created_at asc, id asc`,
      [req.params.conversationId, beforeId]
    );

    return res.status(200).json({ messages: result.rows.slice(-limit), nextBeforeId: result.rows[0]?.id || null });
  } catch (error) {
    return next(error);
  }
}

export async function archiveConversation(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });
    const workspaceId = req.body.workspaceId || req.workspace?.id;
    const result = await pool.query(
      `update conversations
       set archived_at = now(), updated_at = now()
       where id = $1 and workspace_id = $2
       returning id, archived_at`,
      [req.params.conversationId, workspaceId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Conversation not found." });
    return res.status(200).json({ conversation: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

export async function deleteConversation(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });
    const workspaceId = req.body.workspaceId || req.workspace?.id;
    await pool.query("begin");
    try {
      const owns = await pool.query("select id from conversations where id = $1 and workspace_id = $2", [req.params.conversationId, workspaceId]);
      if (!owns.rows[0]) {
        await pool.query("rollback");
        return res.status(404).json({ message: "Conversation not found." });
      }
      await pool.query("delete from messages where conversation_id = $1", [req.params.conversationId]);
      await pool.query("delete from conversations where id = $1", [req.params.conversationId]);
      await pool.query("commit");
      return res.status(200).json({ status: "deleted" });
    } catch (error) {
      await pool.query("rollback");
      throw error;
    }
  } catch (error) {
    return next(error);
  }
}

export async function appendUserMessage(req, res, next) {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(503).json({ message: "PostgreSQL is not configured." });

    const workspaceId = req.body.workspaceId || req.workspace?.id;
    await pool.query(
      `insert into messages (conversation_id, workspace_id, project_id, role, content, created_at)
       values ($1, $2, $3, 'user', $4, now())`,
      [req.params.conversationId, workspaceId, req.body.projectId || null, req.body.content]
    );
    await pool.query("update conversations set updated_at = now(), title = coalesce(nullif(title, 'New conversation'), $2) where id = $1", [
      req.params.conversationId,
      req.body.content?.slice(0, 80) || "Conversation",
    ]);

    return res.status(201).json({ status: "created" });
  } catch (error) {
    return next(error);
  }
}
