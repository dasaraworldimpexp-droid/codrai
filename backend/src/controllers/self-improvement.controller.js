export async function analyzeSelfImprovement(req, res, next) {
  try {
    const engine = req.app.locals.selfImprovementEngine;
    if (!engine) return res.status(503).json({ message: "Self-improvement engine is not configured." });
    const result = await engine.analyze({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      scope: req.body.scope || {},
    });
    return res.status(202).json({ run: result });
  } catch (error) {
    return next(error);
  }
}

export async function listSelfImprovementRuns(req, res, next) {
  try {
    const runs = await req.app.locals.selfImprovementEngine.listRuns({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ runs });
  } catch (error) {
    return next(error);
  }
}

export async function listSelfImprovementProposals(req, res, next) {
  try {
    const proposals = await req.app.locals.selfImprovementEngine.listProposals({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 30),
    });
    return res.status(200).json({ proposals });
  } catch (error) {
    return next(error);
  }
}
