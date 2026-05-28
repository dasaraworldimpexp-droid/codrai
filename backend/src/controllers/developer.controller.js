import { CODRAI_API_SCOPES } from "../services/developer-api-key.service.js";

function workspaceId(req) {
  return req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
}

export async function listDeveloperApiKeys(req, res, next) {
  try {
    const keys = await req.app.locals.developerApiKeyService.listKeys({ workspaceId: workspaceId(req) });
    return res.status(200).json({ keys, scopes: CODRAI_API_SCOPES });
  } catch (error) {
    return next(error);
  }
}

export async function createDeveloperApiKey(req, res, next) {
  try {
    const result = await req.app.locals.developerApiKeyService.createKey({
      workspaceId: workspaceId(req),
      userId: req.user?.id || req.body.userId,
      name: req.body.name,
      scopes: req.body.scopes,
      expiresAt: req.body.expiresAt,
      metadata: req.body.metadata || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function rotateDeveloperApiKey(req, res, next) {
  try {
    const result = await req.app.locals.developerApiKeyService.rotateKey({
      workspaceId: workspaceId(req),
      userId: req.user?.id || req.body.userId,
      keyId: req.params.keyId,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function revokeDeveloperApiKey(req, res, next) {
  try {
    const result = await req.app.locals.developerApiKeyService.revokeKey({
      workspaceId: workspaceId(req),
      userId: req.user?.id || req.body.userId,
      keyId: req.params.keyId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function developerUsage(req, res, next) {
  try {
    const usage = await req.app.locals.developerApiKeyService.usageSummary({
      workspaceId: workspaceId(req),
      limit: req.query.limit,
    });
    return res.status(200).json(usage);
  } catch (error) {
    return next(error);
  }
}

export async function developerDocs(_req, res) {
  return res.status(200).json({
    baseUrl: "/api/v1",
    auth: "Authorization: Bearer sk_codrai_...",
    signing: "Optional x-codrai-timestamp + x-codrai-signature for replay-protected requests.",
    endpoints: [
      "POST /api/v1/chat/completions",
      "POST /api/v1/chat/stream",
      "GET /api/v1/models",
      "GET /api/v1/providers",
      "GET /api/v1/usage",
      "GET /api/v1/health",
    ],
  });
}
