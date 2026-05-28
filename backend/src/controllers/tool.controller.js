export async function listTools(req, res, next) {
  try {
    const toolRegistry = req.app.locals.toolRegistry;

    if (!toolRegistry) {
      return res.status(503).json({ message: "Tool registry is not configured." });
    }

    return res.status(200).json({ tools: toolRegistry.list() });
  } catch (error) {
    return next(error);
  }
}

export async function executeTool(req, res, next) {
  try {
    const toolExecutionEngine = req.app.locals.toolExecutionEngine;

    if (!toolExecutionEngine) {
      return res.status(503).json({ message: "Tool execution engine is not configured." });
    }

    const result = await toolExecutionEngine.execute({
      ...req.body,
      userId: req.user?.id || req.body.userId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
    }, req.user);

    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function cancelToolExecution(req, res, next) {
  try {
    const toolExecutionEngine = req.app.locals.toolExecutionEngine;

    if (!toolExecutionEngine) {
      return res.status(503).json({ message: "Tool execution engine is not configured." });
    }

    const result = await toolExecutionEngine.cancel(req.params.executionId, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
