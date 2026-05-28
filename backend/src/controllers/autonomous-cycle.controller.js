export async function startAutonomousCycle(req, res, next) {
  try {
    const cycle = await req.app.locals.autonomousCycleService.start({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      objective: req.body.objective,
    });
    return res.status(202).json({ cycle });
  } catch (error) {
    return next(error);
  }
}

export async function listAutonomousCycles(req, res, next) {
  try {
    const cycles = await req.app.locals.autonomousCycleService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ cycles });
  } catch (error) {
    return next(error);
  }
}
