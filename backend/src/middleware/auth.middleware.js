import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";

export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  const cookieToken = req.cookies?.codrai_access_token;
  if (!header?.startsWith("Bearer ") && !cookieToken) return next();

  try {
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : cookieToken;
    const payload = jwt.verify(token, env.jwtSecret || process.env.JWT_SECRET || "dev-secret");

    if (req.app?.locals?.pool && payload.sid) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const session = await req.app.locals.pool.query(
        `select id from user_sessions
         where id = $1 and user_id = $2 and token_hash = $3 and revoked_at is null and expires_at > now()`,
        [payload.sid, payload.sub, tokenHash]
      );
      if (!session.rows[0]) return next();
    }

    req.user = { id: payload.sub, email: payload.email, role: payload.role || "user", sessionId: payload.sid };
    req.workspace = payload.workspaceId ? { id: payload.workspaceId } : undefined;
  } catch {
    // Public/local development endpoints can still pass explicit user/workspace ids.
  }
  return next();
}

export function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    return next();
  });
}

export function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => requireAuth(req, res, () => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Insufficient permissions." });
    }
    return next();
  });
}

export function requireWorkspaceRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => requireAuth(req, res, async () => {
    const workspaceId = req.workspace?.id || req.body?.workspaceId || req.query?.workspaceId;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId is required." });
    if (!req.app?.locals?.pool) return res.status(503).json({ message: "Workspace authorization requires PostgreSQL." });
    try {
      const result = await req.app.locals.pool.query(
        "select role from workspace_members where workspace_id = $1 and user_id = $2 limit 1",
        [workspaceId, req.user.id]
      );
      const role = result.rows[0]?.role;
      if (!role || !allowedRoles.includes(role)) return res.status(403).json({ message: "Workspace permission denied." });
      req.workspace = { id: workspaceId, role };
      return next();
    } catch (error) {
      return next(error);
    }
  });
}
