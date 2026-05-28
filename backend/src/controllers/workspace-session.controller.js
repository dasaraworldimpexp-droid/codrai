export async function getWorkspaceSession(req, res, next) {
  try {
    const workspaceSessionService = req.app.locals.workspaceSessionService;

    if (!workspaceSessionService) {
      return res.status(503).json({ message: "Workspace session service is not configured." });
    }

    const session = await workspaceSessionService.getSession({
      userId: req.user?.id || req.query.userId,
      workspaceId: req.workspace?.id || req.query.workspaceId,
      deviceId: req.query.deviceId,
    });

    return res.status(200).json(session);
  } catch (error) {
    return next(error);
  }
}

export async function patchWorkspaceSession(req, res, next) {
  try {
    const workspaceSessionService = req.app.locals.workspaceSessionService;

    if (!workspaceSessionService) {
      return res.status(503).json({ message: "Workspace session service is not configured." });
    }

    const session = await workspaceSessionService.patchSession({
      userId: req.user?.id || req.body.userId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      deviceId: req.body.deviceId,
      patch: req.body.patch,
    });

    return res.status(200).json(session);
  } catch (error) {
    return next(error);
  }
}
