const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId;

export async function createCivilizationIdentity(req, res, next) {
  try {
    const result = await req.app.locals.civilizationRuntimeService.createIdentity({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      userId: user(req),
      agentName: req.body.agentName,
      role: req.body.role,
      personality: req.body.personality,
      capabilities: req.body.capabilities,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listCivilizationIdentities(req, res, next) {
  try {
    const result = await req.app.locals.civilizationRuntimeService.identities({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function learnCivilizationMemory(req, res, next) {
  try {
    const memory = await req.app.locals.civilizationRuntimeService.learn({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      agentId: req.body.agentId,
      memoryType: req.body.memoryType,
      content: req.body.content,
      evidence: req.body.evidence,
      score: req.body.score,
    });
    return res.status(201).json({ memory });
  } catch (error) {
    return next(error);
  }
}

export async function civilizationTopology(req, res, next) {
  try {
    const topology = await req.app.locals.civilizationRuntimeService.topology({
      workspaceId: workspace(req),
      clusterId: req.query.clusterId,
    });
    return res.status(200).json(topology);
  } catch (error) {
    return next(error);
  }
}

export async function planCivilizationStrategy(req, res, next) {
  try {
    const strategy = await req.app.locals.civilizationRuntimeService.planStrategy({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      userId: user(req),
      goal: req.body.goal,
    });
    return res.status(201).json({ strategy });
  } catch (error) {
    return next(error);
  }
}

export async function evolveCivilization(req, res, next) {
  try {
    const run = await req.app.locals.civilizationRuntimeService.evolve({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      userId: user(req),
      goal: req.body.goal,
    });
    return res.status(202).json({ run });
  } catch (error) {
    return next(error);
  }
}

export async function synthesizeCivilizationTool(req, res, next) {
  try {
    const result = await req.app.locals.civilizationRuntimeService.synthesizeTool({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      userId: user(req),
      name: req.body.name,
      url: req.body.url,
      description: req.body.description,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function generateCivilizationMission(req, res, next) {
  try {
    const mission = await req.app.locals.civilizationRuntimeService.generateMission({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      userId: user(req),
      title: req.body.title,
      objective: req.body.objective,
      priority: req.body.priority,
    });
    return res.status(201).json({ mission });
  } catch (error) {
    return next(error);
  }
}

export async function proposeCivilizationPolicy(req, res, next) {
  try {
    const policy = await req.app.locals.civilizationRuntimeService.proposePolicy({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      userId: user(req),
      title: req.body.title,
      policy: req.body.policy,
    });
    return res.status(201).json({ policy });
  } catch (error) {
    return next(error);
  }
}

export async function allocateCivilizationResources(req, res, next) {
  try {
    const entry = await req.app.locals.civilizationRuntimeService.allocateResources({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
      actorId: req.body.actorId,
      credits: req.body.credits,
      reason: req.body.reason,
      metadata: req.body.metadata,
    });
    return res.status(201).json({ entry });
  } catch (error) {
    return next(error);
  }
}

export async function runCivilizationDiagnostics(req, res, next) {
  try {
    const diagnostics = await req.app.locals.civilizationRuntimeService.diagnostics({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId || req.query.clusterId,
      persist: req.method === "POST",
    });
    return res.status(req.method === "POST" ? 201 : 200).json({ diagnostics });
  } catch (error) {
    return next(error);
  }
}

export async function predictCivilizationScaling(req, res, next) {
  try {
    const prediction = await req.app.locals.civilizationRuntimeService.predictiveScaling({
      workspaceId: workspace(req),
      clusterId: req.body.clusterId,
    });
    return res.status(201).json({ prediction });
  } catch (error) {
    return next(error);
  }
}
