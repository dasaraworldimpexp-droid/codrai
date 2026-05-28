const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId || req.query.userId;

export async function productionStatus(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.status({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function activateProduction(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.activate({
      workspaceId: workspace(req),
      userId: user(req),
      runMigrations: req.body.runMigrations !== false,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function evolveRuntime(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.evolveRuntime({
      workspaceId: workspace(req),
      userId: user(req),
      objective: req.body.objective,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createCheckpoint(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.checkpoint({
      workspaceId: workspace(req),
      userId: user(req),
      checkpointType: req.body.checkpointType,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function recoverProduction(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.recover({
      workspaceId: workspace(req),
      userId: user(req),
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function verifyProduction(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.verify({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function hardenSecurity(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.hardenSecurity({
      workspaceId: workspace(req),
      userId: user(req),
      auditType: req.body.auditType,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function evaluateScaling(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.scaling({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function lifecycleAction(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.lifecycle({
      workspaceId: workspace(req),
      userId: user(req),
      serviceName: req.body.serviceName || req.params.serviceName,
      action: req.body.action || req.params.action,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function orchestrationMetrics(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.metrics({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function coordinateRuntime(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.coordinate({
      workspaceId: workspace(req),
      userId: user(req),
      objective: req.body.objective,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function scheduleWorkerTask(req, res, next) {
  try {
    const result = await req.app.locals.productionIntelligenceService.scheduleWorkerTask({
      workspaceId: workspace(req),
      userId: user(req),
      taskType: req.body.taskType,
      requiredCapability: req.body.requiredCapability,
      priority: req.body.priority,
      payload: req.body.payload || {},
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
