import { DeveloperApiKeyService } from "../services/developer-api-key.service.js";

export function requireDeveloperApiKey(requiredScopes = []) {
  const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
  return async (req, res, next) => {
    try {
      const service = req.app.locals.developerApiKeyService || new DeveloperApiKeyService({ pool: req.app.locals.pool });
      const header = req.headers.authorization || "";
      const bearerKey = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
      const secretKey = bearerKey || req.headers["x-codrai-secret-key"];
      const context = await service.authenticateSecret(secretKey, { requiredScopes: scopes });
      const policy = await req.app.locals.enterpriseCloudService?.gatewayPolicy?.({ workspaceId: context.workspaceId });
      const clientIp = req.ip || req.socket?.remoteAddress || "";
      if (policy?.blocked_ips?.includes(clientIp)) {
        return res.status(403).json({ error: { message: "IP address is blocked by workspace gateway policy.", type: "security_error", code: "ip_blocked" } });
      }
      if (policy?.allowed_ips?.length && !policy.allowed_ips.includes(clientIp)) {
        return res.status(403).json({ error: { message: "IP address is not allowed by workspace gateway policy.", type: "security_error", code: "ip_not_allowed" } });
      }
      if (policy?.require_signed_requests && (!req.headers["x-codrai-signature"] || !req.headers["x-codrai-timestamp"])) {
        return res.status(401).json({ error: { message: "Signed requests are required by workspace gateway policy.", type: "authentication_error", code: "signature_required" } });
      }
      service.verifySignature({
        secretKey,
        signature: req.headers["x-codrai-signature"],
        timestamp: req.headers["x-codrai-timestamp"],
        body: req.rawBody || "",
      });
      req.developerApiKey = context;
      req.workspace = { id: context.workspaceId };
      req.user = context.userId ? { id: context.userId, role: "developer_api" } : req.user;
      return next();
    } catch (error) {
      return res.status(error.statusCode || 401).json({
        error: {
          message: error.message || "CODRAI API authentication failed.",
          type: "authentication_error",
          code: error.code || "api_auth_failed",
        },
      });
    }
  };
}

export function enforceDeveloperQuota() {
  return async (req, res, next) => {
    try {
      const service = req.app.locals.developerApiKeyService || new DeveloperApiKeyService({ pool: req.app.locals.pool });
      const quota = await service.checkQuota({ workspaceId: req.developerApiKey.workspaceId });
      res.setHeader("X-CODRAI-RateLimit-Requests-Limit", quota.requestLimit);
      res.setHeader("X-CODRAI-RateLimit-Requests-Remaining", quota.remainingRequests ?? "");
      res.setHeader("X-CODRAI-RateLimit-Tokens-Limit", quota.tokenLimit);
      res.setHeader("X-CODRAI-RateLimit-Tokens-Remaining", quota.remainingTokens ?? "");
      if (!quota.ok) {
        return res.status(429).json({
          error: {
            message: "CODRAI API workspace quota exceeded.",
            type: "rate_limit_error",
            code: "quota_exceeded",
          },
        });
      }
      req.developerQuota = quota;
      return next();
    } catch (error) {
      return res.status(503).json({
        error: {
          message: error.message || "CODRAI quota validation failed.",
          type: "quota_error",
          code: "quota_unavailable",
        },
      });
    }
  };
}
