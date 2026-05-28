export async function heartbeat(req, res, next) {
  try {
    const node = await req.app.locals.distributedRuntimeService.heartbeat({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      nodeId: req.body.nodeId,
      nodeName: req.body.nodeName,
      capabilities: req.body.capabilities || [],
      loadScore: req.body.loadScore || 0,
      metadata: req.body.metadata || {},
    });
    return res.status(202).json({ node });
  } catch (error) {
    return next(error);
  }
}

export async function listNodes(req, res, next) {
  try {
    const nodes = await req.app.locals.distributedRuntimeService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
    });
    return res.status(200).json({ nodes });
  } catch (error) {
    return next(error);
  }
}

export async function runtimeGraph(req, res, next) {
  try {
    const graph = await req.app.locals.distributedRuntimeService.graph({
      workspaceId: req.workspace?.id || req.query.workspaceId,
    });
    return res.status(200).json(graph);
  } catch (error) {
    return next(error);
  }
}
