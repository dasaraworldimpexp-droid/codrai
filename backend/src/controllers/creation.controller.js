export async function listCreationEngines(req, res, next) {
  try {
    const engineRegistry = req.app.locals.creationEngineRegistry;

    if (!engineRegistry) {
      return res.status(503).json({ message: "Creation engine registry is not configured." });
    }

    return res.status(200).json({ engines: engineRegistry.list() });
  } catch (error) {
    return next(error);
  }
}

export async function startCreation(req, res, next) {
  try {
    const creationOrchestrator = req.app.locals.creationOrchestrator;

    if (!creationOrchestrator) {
      return res.status(503).json({ message: "Creation orchestrator is not configured." });
    }

    const result = await creationOrchestrator.create({
      ...req.body,
      userId: req.user?.id || req.body.userId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
    });

    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
