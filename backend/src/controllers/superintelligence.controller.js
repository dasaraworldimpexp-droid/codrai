const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId || req.query.userId;

export async function createMesh(req, res, next) {
  try {
    const mesh = await req.app.locals.superintelligenceMeshService.createMesh({
      workspaceId: workspace(req),
      userId: user(req),
      metaCoreId: req.body.metaCoreId,
      name: req.body.name,
      objective: req.body.objective,
    });
    return res.status(201).json({ mesh });
  } catch (error) {
    return next(error);
  }
}

export async function meshTopology(req, res, next) {
  try {
    const topology = await req.app.locals.superintelligenceMeshService.topology({
      workspaceId: workspace(req),
      meshId: req.params.meshId || req.query.meshId,
    });
    return res.status(200).json(topology);
  } catch (error) {
    return next(error);
  }
}

export async function meshObservability(req, res, next) {
  try {
    const observability = await req.app.locals.superintelligenceMeshService.observability({
      workspaceId: workspace(req),
      meshId: req.params.meshId || req.query.meshId,
    });
    return res.status(200).json(observability);
  } catch (error) {
    return next(error);
  }
}

export async function fuseCognition(req, res, next) {
  try {
    const result = await req.app.locals.superintelligenceMeshService.fuseCognition({ workspaceId: workspace(req), meshId: req.params.meshId });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function generateSpecies(req, res, next) {
  try {
    const result = await req.app.locals.superintelligenceMeshService.generateSpecies({
      workspaceId: workspace(req),
      meshId: req.params.meshId,
      speciesName: req.body.speciesName,
      archetype: req.body.archetype,
      genome: req.body.genome || {},
      inheritance: req.body.inheritance || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function runScience(req, res, next) {
  try {
    const result = await req.app.locals.superintelligenceMeshService.runScience({
      workspaceId: workspace(req),
      meshId: req.params.meshId,
      userId: user(req),
      hypothesis: req.body.hypothesis,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function routeCognition(req, res, next) {
  try {
    const result = await req.app.locals.superintelligenceMeshService.routeInterplanetaryCognition({
      workspaceId: workspace(req),
      meshId: req.params.meshId,
      sourceRef: req.body.sourceRef,
      targetRef: req.body.targetRef,
      routeType: req.body.routeType,
      bandwidthScore: req.body.bandwidthScore,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function simulateWorld(req, res, next) {
  try {
    const result = await req.app.locals.superintelligenceMeshService.simulateWorld({
      workspaceId: workspace(req),
      meshId: req.params.meshId,
      worldName: req.body.worldName,
      scenario: req.body.scenario,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function governMesh(req, res, next) {
  try {
    const result = await req.app.locals.superintelligenceMeshService.govern({
      workspaceId: workspace(req),
      meshId: req.params.meshId,
      userId: user(req),
      lawRef: req.body.lawRef,
      policy: req.body.policy || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function archiveMemory(req, res, next) {
  try {
    const result = await req.app.locals.superintelligenceMeshService.archiveMemory({
      workspaceId: workspace(req),
      meshId: req.params.meshId,
      ancestorRef: req.body.ancestorRef,
      descendantRef: req.body.descendantRef,
      memoryType: req.body.memoryType,
      archive: req.body.archive || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listAsset(req, res, next) {
  try {
    const result = await req.app.locals.superintelligenceMeshService.listAsset({
      workspaceId: workspace(req),
      meshId: req.params.meshId,
      assetType: req.body.assetType,
      ownerRef: req.body.ownerRef,
      valuation: req.body.valuation,
      metadata: req.body.metadata || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}
