function workspace(req) {
  return req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
}

function user(req) {
  return req.user?.id || req.body.userId || req.query.userId;
}

export async function createFederation(req, res, next) {
  try {
    const federation = await req.app.locals.agiFederationService.createFederation({
      workspaceId: workspace(req),
      userId: user(req),
      name: req.body.name,
      objective: req.body.objective,
      coordinationPolicy: req.body.coordinationPolicy || {},
    });
    return res.status(201).json({ federation });
  } catch (error) {
    return next(error);
  }
}

export async function listFederations(req, res, next) {
  try {
    const federations = await req.app.locals.agiFederationService.listFederations({
      workspaceId: workspace(req),
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ federations });
  } catch (error) {
    return next(error);
  }
}

export async function registerFederationNode(req, res, next) {
  try {
    const node = await req.app.locals.agiFederationService.registerNode({
      workspaceId: workspace(req),
      federationId: req.params.federationId,
      runtimeNodeId: req.body.runtimeNodeId,
      nodeName: req.body.nodeName,
      nodeRole: req.body.nodeRole,
      capabilities: req.body.capabilities || [],
      loadScore: req.body.loadScore || 0,
      cognitionState: req.body.cognitionState || {},
    });
    return res.status(202).json({ node });
  } catch (error) {
    return next(error);
  }
}

export async function federationTopology(req, res, next) {
  try {
    const topology = await req.app.locals.agiFederationService.topology({
      workspaceId: workspace(req),
      federationId: req.params.federationId || req.query.federationId,
    });
    return res.status(200).json(topology);
  } catch (error) {
    return next(error);
  }
}

export async function syncCognition(req, res, next) {
  try {
    const sync = await req.app.locals.agiFederationService.synchronizeCognition({
      workspaceId: workspace(req),
      federationId: req.params.federationId,
      sourceNodeId: req.body.sourceNodeId,
      targetNodeId: req.body.targetNodeId,
      cognitionType: req.body.cognitionType,
      payload: req.body.payload || {},
      confidence: req.body.confidence || 0.5,
    });
    return res.status(202).json({ sync });
  } catch (error) {
    return next(error);
  }
}

export async function routeFederationWorkload(req, res, next) {
  try {
    const result = await req.app.locals.agiFederationService.routeWorkload({
      workspaceId: workspace(req),
      userId: user(req),
      federationId: req.params.federationId,
      taskType: req.body.taskType,
      requiredCapability: req.body.requiredCapability,
      priority: req.body.priority || 5,
      payload: req.body.payload || {},
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function openFederationConsensus(req, res, next) {
  try {
    const result = await req.app.locals.agiFederationService.openConsensus({
      workspaceId: workspace(req),
      userId: user(req),
      federationId: req.params.federationId,
      proposal: req.body.proposal,
      votes: req.body.votes || [],
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function superviseFederation(req, res, next) {
  try {
    const result = await req.app.locals.agiFederationService.supervise({
      workspaceId: workspace(req),
      federationId: req.params.federationId || req.body.federationId,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function deploymentReadiness(req, res, next) {
  try {
    const result = await req.app.locals.agiFederationService.deploymentReadiness({
      workspaceId: workspace(req),
      federationId: req.params.federationId || req.body.federationId,
      target: req.body.target || req.query.target || "production",
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
