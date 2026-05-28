const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId || req.query.userId;

export async function gridStatus(req, res, next) {
  try {
    const result = await req.app.locals.globalExecutionGridService.status({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function gridTopology(req, res, next) {
  try {
    const result = await req.app.locals.globalExecutionGridService.topology({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function registerGridWorker(req, res, next) {
  try {
    const result = await req.app.locals.globalExecutionGridService.registerWorker({
      workspaceId: workspace(req),
      userId: user(req),
      workerName: req.body.workerName,
      workerRole: req.body.workerRole,
      capabilities: req.body.capabilities || [],
      permissions: req.body.permissions || req.body.governancePolicy || {},
      loadScore: req.body.loadScore,
      metadata: req.body.metadata || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function routeGridWorkload(req, res, next) {
  try {
    const result = await req.app.locals.globalExecutionGridService.routeWorkload({
      workspaceId: workspace(req),
      projectId: req.body.projectId,
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

export async function recoverGrid(req, res, next) {
  try {
    const result = await req.app.locals.globalExecutionGridService.recover({
      workspaceId: workspace(req),
      userId: user(req),
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function gridContainerStatus(req, res, next) {
  try {
    const result = await req.app.locals.globalExecutionGridService.containerStatus({
      workspaceId: workspace(req),
      userId: user(req),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function syncGridMemory(req, res, next) {
  try {
    const result = await req.app.locals.globalExecutionGridService.syncMemory({
      workspaceId: workspace(req),
      userId: user(req),
      workerId: req.body.workerId,
      memoryType: req.body.memoryType,
      payload: req.body.payload || {},
      syncScore: req.body.syncScore,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function auditGrid(req, res, next) {
  try {
    const result = await req.app.locals.globalExecutionGridService.audit({
      workspaceId: workspace(req),
      userId: user(req),
      auditType: req.body.auditType,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
