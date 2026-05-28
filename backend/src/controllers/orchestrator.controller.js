export async function startRun(req, res, next) {
  try {
    const service = req.app.locals.orchestratorService;
    if (!service) return res.status(503).json({ message: "Orchestrator service is not configured." });
    const result = await service.start({
      ...req.body,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function resumeRun(req, res, next) {
  try {
    const result = await req.app.locals.orchestratorService.resume({
      runId: req.params.runId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listRuns(req, res, next) {
  try {
    const runs = await req.app.locals.orchestratorService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 30),
    });
    return res.status(200).json({ runs });
  } catch (error) {
    return next(error);
  }
}

export async function getRun(req, res, next) {
  try {
    const run = await req.app.locals.orchestratorService.getRun({
      runId: req.params.runId,
      workspaceId: req.workspace?.id || req.query.workspaceId,
    });
    return res.status(200).json(run);
  } catch (error) {
    return next(error);
  }
}

export async function cancelRun(req, res, next) {
  try {
    const result = await req.app.locals.orchestratorService.cancel({
      runId: req.params.runId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
