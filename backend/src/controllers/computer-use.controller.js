export async function runComputerUse(req, res, next) {
  try {
    const session = await req.app.locals.computerUseService.run({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      startUrl: req.body.startUrl,
      steps: req.body.steps || [],
    });
    return res.status(202).json({ session });
  } catch (error) {
    return next(error);
  }
}

export async function listComputerUseSessions(req, res, next) {
  try {
    const sessions = await req.app.locals.computerUseService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ sessions });
  } catch (error) {
    return next(error);
  }
}

export async function replayComputerUseSession(req, res, next) {
  try {
    const replay = await req.app.locals.computerUseService.replay({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      sessionId: req.params.sessionId,
    });
    return res.status(200).json(replay);
  } catch (error) {
    return next(error);
  }
}
