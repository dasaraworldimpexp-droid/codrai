export function listEnterpriseModules(req, res) {
  const enterpriseModuleRegistry = req.app.locals.enterpriseModuleRegistry;
  if (!enterpriseModuleRegistry) return res.status(503).json({ message: "Enterprise registry is not configured." });
  return res.status(200).json({ modules: enterpriseModuleRegistry.list() });
}

export async function executeEnterpriseAction(req, res, next) {
  try {
    const enterpriseOrchestrator = req.app.locals.enterpriseOrchestrator;
    if (!enterpriseOrchestrator) return res.status(503).json({ message: "Enterprise orchestrator is not configured." });

    const result = await enterpriseOrchestrator.execute({
      ...req.body,
      userId: req.user?.id || req.body.userId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
    });

    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
