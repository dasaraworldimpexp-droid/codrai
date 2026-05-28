export async function startInternetExecution(req, res, next) {
  try {
    const session = await req.app.locals.internetExecutionService.start({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      objective: req.body.objective,
      startUrl: req.body.startUrl,
    });
    return res.status(202).json({ session });
  } catch (error) {
    return next(error);
  }
}

export async function listInternetExecutions(req, res, next) {
  try {
    const sessions = await req.app.locals.internetExecutionService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 30),
    });
    return res.status(200).json({ sessions });
  } catch (error) {
    return next(error);
  }
}

export async function getInternetExecution(req, res, next) {
  try {
    const session = await req.app.locals.internetExecutionService.get({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      sessionId: req.params.sessionId,
    });
    return res.status(200).json({ session });
  } catch (error) {
    return next(error);
  }
}

export async function replayInternetExecution(req, res, next) {
  try {
    const session = await req.app.locals.internetExecutionService.replay({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      sessionId: req.params.sessionId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json({ session });
  } catch (error) {
    return next(error);
  }
}
