const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId || req.query.userId;

export async function createMetaCore(req, res, next) {
  try {
    const core = await req.app.locals.metaIntelligenceService.createCore({
      workspaceId: workspace(req),
      userId: user(req),
      civilizationId: req.body.civilizationId,
      federationId: req.body.federationId,
      name: req.body.name,
      objective: req.body.objective,
    });
    return res.status(201).json({ core });
  } catch (error) {
    return next(error);
  }
}

export async function metaTopology(req, res, next) {
  try {
    const topology = await req.app.locals.metaIntelligenceService.topology({
      workspaceId: workspace(req),
      metaCoreId: req.params.metaCoreId || req.query.metaCoreId,
    });
    return res.status(200).json(topology);
  } catch (error) {
    return next(error);
  }
}

export async function metaObservability(req, res, next) {
  try {
    const observability = await req.app.locals.metaIntelligenceService.observability({
      workspaceId: workspace(req),
      metaCoreId: req.params.metaCoreId || req.query.metaCoreId,
    });
    return res.status(200).json(observability);
  } catch (error) {
    return next(error);
  }
}

export async function reflectMetaCore(req, res, next) {
  try {
    const result = await req.app.locals.metaIntelligenceService.reflect({
      workspaceId: workspace(req),
      metaCoreId: req.params.metaCoreId,
      cycleType: req.body.cycleType,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function registerPlanetaryNode(req, res, next) {
  try {
    const result = await req.app.locals.metaIntelligenceService.registerPlanetaryNode({
      workspaceId: workspace(req),
      metaCoreId: req.params.metaCoreId,
      nodeRef: req.body.nodeRef,
      region: req.body.region,
      capabilities: req.body.capabilities || [],
      governanceState: req.body.governanceState || {},
      intelligenceLoad: req.body.intelligenceLoad || 0,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function proposeRuntimeGenome(req, res, next) {
  try {
    const result = await req.app.locals.metaIntelligenceService.proposeRuntimeGenome({
      workspaceId: workspace(req),
      metaCoreId: req.params.metaCoreId,
      targetRuntime: req.body.targetRuntime,
      mutationType: req.body.mutationType,
      genome: req.body.genome || {},
      mutationPlan: req.body.mutationPlan || {},
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function recordMemory(req, res, next) {
  try {
    const result = await req.app.locals.metaIntelligenceService.recordMemory({
      workspaceId: workspace(req),
      metaCoreId: req.params.metaCoreId,
      memoryType: req.body.memoryType,
      content: req.body.content,
      lineage: req.body.lineage || {},
      score: req.body.score,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createEconomyExchange(req, res, next) {
  try {
    const result = await req.app.locals.metaIntelligenceService.createEconomyExchange({
      workspaceId: workspace(req),
      metaCoreId: req.params.metaCoreId,
      exchangeType: req.body.exchangeType,
      contributorRef: req.body.contributorRef,
      consumerRef: req.body.consumerRef,
      valuationCredits: req.body.valuationCredits,
      metadata: req.body.metadata || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function startResearch(req, res, next) {
  try {
    const result = await req.app.locals.metaIntelligenceService.startResearch({
      workspaceId: workspace(req),
      userId: user(req),
      metaCoreId: req.params.metaCoreId,
      hypothesis: req.body.hypothesis,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
