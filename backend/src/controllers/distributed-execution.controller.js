export async function scheduleDistributedTask(req, res, next) {
  try {
    const task = await req.app.locals.distributedExecutionService.schedule({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      source: req.body.source,
      taskType: req.body.taskType,
      requiredCapability: req.body.requiredCapability,
      priority: req.body.priority,
      payload: req.body.payload,
      resourceLimits: req.body.resourceLimits,
      maxAttempts: req.body.maxAttempts,
    });
    return res.status(201).json({ task });
  } catch (error) {
    return next(error);
  }
}

export async function executeDistributedTask(req, res, next) {
  try {
    const task = await req.app.locals.distributedExecutionService.execute({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      taskId: req.params.taskId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json({ task });
  } catch (error) {
    return next(error);
  }
}

export async function commandDistributedTask(req, res, next) {
  try {
    const result = await req.app.locals.distributedExecutionService.command({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      taskId: req.params.taskId,
      userId: req.user?.id || req.body.userId,
      command: req.body.command,
    });
    return res.status(202).json({ result });
  } catch (error) {
    return next(error);
  }
}

export async function listDistributedTasks(req, res, next) {
  try {
    const tasks = await req.app.locals.distributedExecutionService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      status: req.query.status,
      limit: Number(req.query.limit || 50),
    });
    return res.status(200).json({ tasks });
  } catch (error) {
    return next(error);
  }
}

export async function getDistributedTask(req, res, next) {
  try {
    const task = await req.app.locals.distributedExecutionService.get({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      taskId: req.params.taskId,
    });
    return res.status(200).json({ task });
  } catch (error) {
    return next(error);
  }
}

export async function distributedTaskTimeline(req, res, next) {
  try {
    const timeline = await req.app.locals.distributedExecutionService.timeline({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      taskId: req.params.taskId,
      limit: Number(req.query.limit || 100),
    });
    return res.status(200).json(timeline);
  } catch (error) {
    return next(error);
  }
}

export async function distributedTaskReplay(req, res, next) {
  try {
    const replay = await req.app.locals.distributedExecutionService.replay({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      taskId: req.params.taskId,
    });
    return res.status(200).json(replay);
  } catch (error) {
    return next(error);
  }
}

export async function recoverDistributedTasks(req, res, next) {
  try {
    const recovery = await req.app.locals.distributedExecutionService.recover({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json(recovery);
  } catch (error) {
    return next(error);
  }
}

export async function distributedExecutionAnalytics(req, res, next) {
  try {
    const analytics = await req.app.locals.distributedExecutionService.analytics({
      workspaceId: req.workspace?.id || req.query.workspaceId,
    });
    return res.status(200).json(analytics);
  } catch (error) {
    return next(error);
  }
}

export async function runtimeScalingDecision(req, res, next) {
  try {
    const decision = await req.app.locals.distributedExecutionService.scaling({
      workspaceId: req.workspace?.id || req.body.workspaceId || req.query.workspaceId,
    });
    return res.status(201).json({ decision });
  } catch (error) {
    return next(error);
  }
}
