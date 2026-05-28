export async function startWorkflowRun(req, res, next) {
  try {
    const workflowEngine = req.app.locals.workflowEngine;

    if (!workflowEngine) {
      return res.status(503).json({ message: "Workflow engine is not configured." });
    }

    const result = await workflowEngine.start(req.body.workflowDefinition, {
      userId: req.user?.id || req.body.userId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
    });

    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function saveWorkflow(req, res, next) {
  try {
    const workflowRepository = req.app.locals.workflowRepository;
    if (!workflowRepository) {
      return res.status(503).json({ message: "Workflow repository is not configured." });
    }
    const workflow = await workflowRepository.saveDefinition({
      ...req.body,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      createdBy: req.user?.id || req.body.createdBy,
    });
    return res.status(200).json({ workflow });
  } catch (error) {
    return next(error);
  }
}

export async function listWorkflows(req, res, next) {
  try {
    const workflowRepository = req.app.locals.workflowRepository;
    if (!workflowRepository) {
      return res.status(503).json({ message: "Workflow repository is not configured." });
    }
    const workflows = await workflowRepository.listDefinitions({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 30),
    });
    return res.status(200).json({ workflows });
  } catch (error) {
    return next(error);
  }
}

export async function startSavedWorkflowRun(req, res, next) {
  try {
    const workflowRepository = req.app.locals.workflowRepository;
    const workflowEngine = req.app.locals.workflowEngine;
    const workspaceId = req.workspace?.id || req.body.workspaceId;
    const workflow = await workflowRepository.getDefinition({ id: req.params.workflowId, workspaceId });
    if (!workflow) return res.status(404).json({ message: "Workflow not found." });
    const result = await workflowEngine.start(workflow.definition, {
      userId: req.user?.id || req.body.userId,
      workspaceId,
      projectId: req.body.projectId || workflow.project_id,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getWorkflowRun(req, res, next) {
  try {
    const workflowRepository = req.app.locals.workflowRepository;

    if (!workflowRepository) {
      return res.status(503).json({ message: "Workflow repository is not configured." });
    }

    const run = await workflowRepository.getRun(req.params.runId);
    return res.status(200).json(run);
  } catch (error) {
    return next(error);
  }
}
