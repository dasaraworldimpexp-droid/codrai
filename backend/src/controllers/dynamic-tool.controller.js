export async function createDynamicTool(req, res, next) {
  try {
    const tool = await req.app.locals.dynamicToolService.create({
      ...req.body,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(201).json({ tool });
  } catch (error) {
    return next(error);
  }
}

export async function listDynamicTools(req, res, next) {
  try {
    const tools = await req.app.locals.dynamicToolService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
    });
    return res.status(200).json({ tools });
  } catch (error) {
    return next(error);
  }
}
