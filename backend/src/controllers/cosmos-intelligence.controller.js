const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId;

export async function createCosmosUniverse(req, res, next) {
  try {
    const universe = await req.app.locals.cosmosIntelligenceService.createUniverse({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      userId: user(req),
      name: req.body.name,
      objective: req.body.objective,
    });
    return res.status(201).json({ universe });
  } catch (error) {
    return next(error);
  }
}

export async function generateSyntheticCivilization(req, res, next) {
  try {
    const civilization = await req.app.locals.cosmosIntelligenceService.generateSyntheticCivilization({
      workspaceId: workspace(req),
      universeId: req.params.universeId,
      name: req.body.name,
      archetype: req.body.archetype,
      traits: req.body.traits,
    });
    return res.status(201).json({ civilization });
  } catch (error) {
    return next(error);
  }
}

export async function simulateCosmosUniverse(req, res, next) {
  try {
    const simulation = await req.app.locals.cosmosIntelligenceService.simulateUniverse({
      workspaceId: workspace(req),
      universeId: req.params.universeId,
      horizon: req.body.horizon,
    });
    return res.status(201).json({ simulation });
  } catch (error) {
    return next(error);
  }
}

export async function optimizeCosmosResearch(req, res, next) {
  try {
    const research = await req.app.locals.cosmosIntelligenceService.optimizeResearch({
      workspaceId: workspace(req),
      universeId: req.params.universeId,
      userId: user(req),
      title: req.body.title,
      hypothesis: req.body.hypothesis,
    });
    return res.status(201).json({ research });
  } catch (error) {
    return next(error);
  }
}

export async function synthesizeCosmosKnowledge(req, res, next) {
  try {
    const memory = await req.app.locals.cosmosIntelligenceService.synthesizeKnowledge({
      workspaceId: workspace(req),
      universeId: req.params.universeId,
      content: req.body.content,
      inheritance: req.body.inheritance,
    });
    return res.status(201).json({ memory });
  } catch (error) {
    return next(error);
  }
}

export async function evolveCosmosPolicy(req, res, next) {
  try {
    const policy = await req.app.locals.cosmosIntelligenceService.evolvePolicy({
      workspaceId: workspace(req),
      universeId: req.params.universeId,
      userId: user(req),
      title: req.body.title,
      policy: req.body.policy,
    });
    return res.status(201).json({ policy });
  } catch (error) {
    return next(error);
  }
}

export async function forecastCosmosRisk(req, res, next) {
  try {
    const forecast = await req.app.locals.cosmosIntelligenceService.forecastRisk({
      workspaceId: workspace(req),
      universeId: req.params.universeId,
      horizon: req.body.horizon,
    });
    return res.status(201).json({ forecast });
  } catch (error) {
    return next(error);
  }
}

export async function mutateCosmosInfrastructure(req, res, next) {
  try {
    const mutation = await req.app.locals.cosmosIntelligenceService.mutateInfrastructure({
      workspaceId: workspace(req),
      universeId: req.params.universeId,
      targetRef: req.body.targetRef,
      url: req.body.url,
    });
    return res.status(201).json({ mutation });
  } catch (error) {
    return next(error);
  }
}

export async function sendCosmosDiplomacy(req, res, next) {
  try {
    const diplomacy = await req.app.locals.cosmosIntelligenceService.diplomacy({
      workspaceId: workspace(req),
      universeId: req.params.universeId,
      fromRef: req.body.fromRef,
      toRef: req.body.toRef,
      protocol: req.body.protocol,
      payload: req.body.payload,
    });
    return res.status(201).json({ diplomacy });
  } catch (error) {
    return next(error);
  }
}

export async function cosmosTopology(req, res, next) {
  try {
    const topology = await req.app.locals.cosmosIntelligenceService.topology({
      workspaceId: workspace(req),
      universeId: req.query.universeId,
    });
    return res.status(200).json(topology);
  } catch (error) {
    return next(error);
  }
}

export async function cosmosAnalytics(req, res, next) {
  try {
    const analytics = await req.app.locals.cosmosIntelligenceService.analytics({
      workspaceId: workspace(req),
      universeId: req.query.universeId,
    });
    return res.status(200).json(analytics);
  } catch (error) {
    return next(error);
  }
}
