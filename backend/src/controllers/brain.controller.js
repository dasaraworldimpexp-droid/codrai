export async function executeBrainOperation(req, res, next) {
  try {
    const masterBrain = req.app.locals.masterBrain;
    if (!masterBrain) return res.status(503).json({ message: "CODRAI Master Brain is not configured." });

    const result = await masterBrain.execute({
      ...req.body,
      userId: req.user?.id || req.body.userId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
    }, req.user);

    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export function getBrainCapabilities(req, res) {
  const masterBrain = req.app.locals.masterBrain;
  if (!masterBrain) return res.status(503).json({ message: "CODRAI Master Brain is not configured." });
  return res.status(200).json(masterBrain.capabilities());
}
