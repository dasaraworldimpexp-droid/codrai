export async function analyzeHealing(req, res, next) {
  try {
    const report = await req.app.locals.selfHealingService.analyze({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      sourceType: req.body.sourceType,
      sourceId: req.body.sourceId,
      autoRecover: req.body.autoRecover === true,
    });
    return res.status(202).json({ report });
  } catch (error) {
    return next(error);
  }
}

export async function listHealingReports(req, res, next) {
  try {
    const reports = await req.app.locals.selfHealingService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ reports });
  } catch (error) {
    return next(error);
  }
}
