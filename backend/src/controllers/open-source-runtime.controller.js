export async function openSourceRuntimeStatus(req, res, next) {
  try {
    const result = await req.app.locals.openSourceRuntimeService.status({
      workspaceId: req.workspace?.id || req.query.workspaceId || "local-workspace",
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function openSourceGpuStatus(req, res, next) {
  try {
    const result = await req.app.locals.openSourceRuntimeService.gpu();
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function pullOpenSourceModel(req, res, next) {
  try {
    const result = await req.app.locals.openSourceRuntimeService.pullOllamaModel({
      workspaceId: req.workspace?.id || req.body.workspaceId || "local-workspace",
      userId: req.user?.id,
      model: req.body.model,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
