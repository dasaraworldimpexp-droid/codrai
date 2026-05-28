export async function ingestUrl(req, res, next) {
  try {
    const source = await req.app.locals.realtimeKnowledgeService.ingestUrl({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      url: req.body.url,
    });
    return res.status(202).json({ source });
  } catch (error) {
    return next(error);
  }
}

export async function listKnowledgeSources(req, res, next) {
  try {
    const sources = await req.app.locals.realtimeKnowledgeService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 30),
    });
    return res.status(200).json({ sources });
  } catch (error) {
    return next(error);
  }
}

export async function rankKnowledgeSources(req, res, next) {
  try {
    const sources = await req.app.locals.realtimeKnowledgeService.rankSources({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ sources });
  } catch (error) {
    return next(error);
  }
}
