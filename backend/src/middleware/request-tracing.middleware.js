import { randomUUID } from "node:crypto";

const IGNORED_PREFIXES = ["/api/health"];

function shouldTrace(path) {
  return path?.startsWith?.("/api/") && !IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function requestTracing() {
  return (req, res, next) => {
    const requestId = req.headers["x-request-id"] || randomUUID();
    const startedAt = Date.now();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    res.on("finish", () => {
      if (!shouldTrace(req.originalUrl || req.url)) return;
      const pool = req.app?.locals?.pool;
      if (!pool) return;
      const workspaceId = req.workspace?.id || req.body?.workspaceId || req.query?.workspaceId || null;
      const userId = req.user?.id || null;
      const responseBytes = Number(res.getHeader("content-length") || 0);
      const requestBytes = Number(req.headers["content-length"] || 0);
      pool.query(
        `insert into request_traces
          (id, workspace_id, user_id, method, path, status_code, latency_ms, user_agent, ip_address, request_bytes, response_bytes, metadata, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())`,
        [
          requestId,
          workspaceId,
          userId,
          req.method,
          (req.originalUrl || req.url || "").slice(0, 500),
          res.statusCode,
          Date.now() - startedAt,
          req.headers["user-agent"] || null,
          req.ip || req.socket?.remoteAddress || null,
          Number.isFinite(requestBytes) ? requestBytes : 0,
          Number.isFinite(responseBytes) ? responseBytes : 0,
          { route: req.route?.path || null },
        ]
      ).catch(() => {
        // Request tracing must never break API responses.
      });
    });

    return next();
  };
}
