const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId || "local-workspace";
const user = (req) => req.user?.id || req.body.userId || req.query.userId;

export async function infrastructureStatus(req, res, next) {
  try {
    const result = await req.app.locals.infrastructureActivationService.status({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function activateInfrastructure(req, res, next) {
  try {
    const result = await req.app.locals.infrastructureActivationService.activate({
      workspaceId: workspace(req),
      userId: user(req),
      target: req.body.target,
      runMigrations: req.body.runMigrations !== false,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function recoverInfrastructure(req, res, next) {
  try {
    const result = await req.app.locals.infrastructureActivationService.recover({
      workspaceId: workspace(req),
      userId: user(req),
      runMigrations: req.body.runMigrations === true,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
