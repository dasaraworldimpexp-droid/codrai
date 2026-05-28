const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId || req.query.userId;

export async function createCivilizationNetwork(req, res, next) {
  try {
    const civilization = await req.app.locals.civilizationNetworkService.create({
      workspaceId: workspace(req),
      userId: user(req),
      federationId: req.body.federationId,
      name: req.body.name,
      objective: req.body.objective,
    });
    return res.status(201).json({ civilization });
  } catch (error) {
    return next(error);
  }
}

export async function civilizationNetworkTopology(req, res, next) {
  try {
    const topology = await req.app.locals.civilizationNetworkService.topology({
      workspaceId: workspace(req),
      civilizationId: req.params.civilizationId || req.query.civilizationId,
    });
    return res.status(200).json(topology);
  } catch (error) {
    return next(error);
  }
}

export async function transitionCivilizationLifecycle(req, res, next) {
  try {
    const civilization = await req.app.locals.civilizationNetworkService.lifecycle({
      workspaceId: workspace(req),
      civilizationId: req.params.civilizationId,
      userId: user(req),
      targetState: req.body.targetState,
    });
    return res.status(202).json({ civilization });
  } catch (error) {
    return next(error);
  }
}

export async function runRecursiveEvolution(req, res, next) {
  try {
    const result = await req.app.locals.civilizationNetworkService.recursiveEvolution({
      workspaceId: workspace(req),
      civilizationId: req.params.civilizationId,
      userId: user(req),
      objective: req.body.objective,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createEconomyContract(req, res, next) {
  try {
    const economy = await req.app.locals.civilizationNetworkService.createEconomyContract({
      workspaceId: workspace(req),
      civilizationId: req.params.civilizationId,
      capability: req.body.capability,
      providerRef: req.body.providerRef,
      consumerRef: req.body.consumerRef,
      priceCredits: req.body.priceCredits,
      terms: req.body.terms || {},
    });
    return res.status(201).json(economy);
  } catch (error) {
    return next(error);
  }
}

export async function arbitrateEconomy(req, res, next) {
  try {
    const arbitration = await req.app.locals.civilizationNetworkService.arbitrateEconomy({
      workspaceId: workspace(req),
      civilizationId: req.params.civilizationId,
    });
    return res.status(202).json({ arbitration });
  } catch (error) {
    return next(error);
  }
}

export async function recordGovernanceDecision(req, res, next) {
  try {
    const governance = await req.app.locals.civilizationNetworkService.governanceDecision({
      workspaceId: workspace(req),
      civilizationId: req.params.civilizationId,
      userId: user(req),
      policyRef: req.body.policyRef,
      decision: req.body.decision,
      rationale: req.body.rationale || {},
    });
    return res.status(201).json(governance);
  } catch (error) {
    return next(error);
  }
}

export async function proposeKernelMutation(req, res, next) {
  try {
    const mutations = await req.app.locals.civilizationNetworkService.proposeKernelMutation({
      workspaceId: workspace(req),
      civilizationId: req.params.civilizationId,
      userId: user(req),
      targetRuntime: req.body.targetRuntime,
      mutationType: req.body.mutationType,
      plan: req.body.plan || {},
    });
    return res.status(202).json(mutations);
  } catch (error) {
    return next(error);
  }
}

export async function civilizationObservability(req, res, next) {
  try {
    const observability = await req.app.locals.civilizationNetworkService.observability({
      workspaceId: workspace(req),
      civilizationId: req.params.civilizationId || req.query.civilizationId,
    });
    return res.status(200).json(observability);
  } catch (error) {
    return next(error);
  }
}
