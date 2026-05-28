export async function generateApp(req, res, next) {
  try {
    const run = await req.app.locals.appFactoryService.generate({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      goal: req.body.goal,
    });
    return res.status(202).json({ run });
  } catch (error) {
    return next(error);
  }
}

export async function listAppGenerations(req, res, next) {
  try {
    const runs = await req.app.locals.appFactoryService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ runs });
  } catch (error) {
    return next(error);
  }
}
