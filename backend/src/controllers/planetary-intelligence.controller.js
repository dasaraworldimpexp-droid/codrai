const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId;

export async function startPlanetaryResearch(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.startResearchProgram({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      userId: user(req),
      title: req.body.title,
      hypothesis: req.body.hypothesis,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function generatePlanetaryWorldModel(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.generateWorldModel({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      modelType: req.body.modelType,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function forecastPlanetaryCivilization(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.forecastCivilization({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      horizon: req.body.horizon,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function detectPlanetaryAnomalies(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.detectAnomalies({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function rankPlanetaryIntelligence(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.rankIntelligence({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listPlanetaryCapability(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.listCapability({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      capability: req.body.capability,
      providerRef: req.body.providerRef,
      priceCredits: req.body.priceCredits,
      metadata: req.body.metadata,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function replicatePlanetaryRuntime(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.replicateRuntime({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      sourceRef: req.body.sourceRef,
      targetRef: req.body.targetRef,
      replicationType: req.body.replicationType,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function mutationTestPlanetaryRuntime(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.mutationTest({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      url: req.body.url,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function planetaryTopology(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.topology({
      workspaceId: workspace(req),
      clusterId: req.query.clusterId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function planetaryAnalytics(req, res, next) {
  try {
    const result = await req.app.locals.planetaryIntelligenceService.analytics({
      workspaceId: workspace(req),
      clusterId: req.query.clusterId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
