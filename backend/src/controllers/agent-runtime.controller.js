export async function startAgentRun(req, res, next) {
  try {
    const multiAgentRuntime = req.app.locals.multiAgentRuntime;

    if (!multiAgentRuntime && !req.app.locals.agentExecutionService) {
      return res.status(503).json({ message: "Agent runtime is not configured." });
    }

    if (req.app.locals.agentExecutionService) {
      const result = await req.app.locals.agentExecutionService.run({
        ...req.body,
        objective: req.body.objective || req.body.goal,
        agentType: req.body.agentType,
        userId: req.user?.id || req.body.userId,
        workspaceId: req.workspace?.id || req.body.workspaceId,
      });
      return res.status(202).json(result);
    }

    const result = await multiAgentRuntime.run({
      ...req.body,
      userId: req.user?.id || req.body.userId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
    });

    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function agentCatalog(req, res, next) {
  try {
    const service = req.app.locals.agentExecutionService;
    if (!service) return res.status(503).json({ message: "Agent execution service is not configured." });
    const result = await service.catalog({ workspaceId: req.query.workspaceId || req.workspace?.id || "local-workspace" });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function agentRuntimeStatus(req, res, next) {
  try {
    const service = req.app.locals.agentExecutionService;
    if (!service) return res.status(503).json({ message: "Agent execution service is not configured." });
    const result = await service.status({ workspaceId: req.query.workspaceId || req.workspace?.id || "local-workspace" });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listAgentRuns(req, res, next) {
  try {
    const service = req.app.locals.agentExecutionService;
    if (!service) return res.status(503).json({ message: "Agent execution service is not configured." });
    const runs = await service.list({
      workspaceId: req.query.workspaceId || req.workspace?.id,
      limit: Number(req.query.limit || 30),
    });
    return res.status(200).json({ runs });
  } catch (error) {
    return next(error);
  }
}

export async function listAgentMessages(req, res, next) {
  try {
    const service = req.app.locals.agentExecutionService;
    if (!service) return res.status(503).json({ message: "Agent execution service is not configured." });
    const messages = await service.messages({
      workspaceId: req.query.workspaceId || req.workspace?.id || "local-workspace",
      runId: req.params.runId || req.query.runId,
      limit: Number(req.query.limit || 50),
    });
    return res.status(200).json({ messages });
  } catch (error) {
    return next(error);
  }
}

export async function agentRunDag(req, res, next) {
  try {
    const service = req.app.locals.agentExecutionService;
    if (!service) return res.status(503).json({ message: "Agent execution service is not configured." });
    const dag = await service.dag({
      workspaceId: req.query.workspaceId || req.workspace?.id || "local-workspace",
      runId: req.params.runId,
    });
    return res.status(200).json(dag);
  } catch (error) {
    return next(error);
  }
}

export async function agentRunReplay(req, res, next) {
  try {
    const service = req.app.locals.agentExecutionService;
    if (!service) return res.status(503).json({ message: "Agent execution service is not configured." });
    const replay = await service.replay({
      workspaceId: req.query.workspaceId || req.workspace?.id || "local-workspace",
      runId: req.params.runId,
    });
    return res.status(200).json(replay);
  } catch (error) {
    return next(error);
  }
}
