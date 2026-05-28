const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId || req.query.userId;

export async function createQuantumField(req, res, next) {
  try {
    const field = await req.app.locals.quantumIntelligenceService.createField({
      workspaceId: workspace(req),
      userId: user(req),
      meshId: req.body.meshId,
      fieldName: req.body.fieldName,
      objective: req.body.objective,
    });
    return res.status(201).json({ field });
  } catch (error) {
    return next(error);
  }
}

export async function quantumTopology(req, res, next) {
  try {
    const topology = await req.app.locals.quantumIntelligenceService.topology({
      workspaceId: workspace(req),
      fieldId: req.params.fieldId || req.query.fieldId,
    });
    return res.status(200).json(topology);
  } catch (error) {
    return next(error);
  }
}

export async function quantumObservability(req, res, next) {
  try {
    const observability = await req.app.locals.quantumIntelligenceService.observability({
      workspaceId: workspace(req),
      fieldId: req.params.fieldId || req.query.fieldId,
    });
    return res.status(200).json(observability);
  } catch (error) {
    return next(error);
  }
}

export async function harmonizeQuantumField(req, res, next) {
  try {
    const result = await req.app.locals.quantumIntelligenceService.harmonize({
      workspaceId: workspace(req),
      fieldId: req.params.fieldId,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createConsciousnessLoop(req, res, next) {
  try {
    const result = await req.app.locals.quantumIntelligenceService.createConsciousnessLoop({
      workspaceId: workspace(req),
      fieldId: req.params.fieldId,
      identityRef: req.body.identityRef,
      reflectionState: req.body.reflectionState || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function simulateMultiverse(req, res, next) {
  try {
    const result = await req.app.locals.quantumIntelligenceService.simulateMultiverse({
      workspaceId: workspace(req),
      fieldId: req.params.fieldId,
      universeRef: req.body.universeRef,
      scenario: req.body.scenario,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function federateDimension(req, res, next) {
  try {
    const result = await req.app.locals.quantumIntelligenceService.federateDimension({
      workspaceId: workspace(req),
      fieldId: req.params.fieldId,
      sourceDimension: req.body.sourceDimension,
      targetDimension: req.body.targetDimension,
      routePolicy: req.body.routePolicy || {},
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function synthesizeGovernance(req, res, next) {
  try {
    const result = await req.app.locals.quantumIntelligenceService.synthesizeGovernance({
      workspaceId: workspace(req),
      userId: user(req),
      fieldId: req.params.fieldId,
      policyRef: req.body.policyRef,
      policy: req.body.policy || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function archiveQuantumMemory(req, res, next) {
  try {
    const result = await req.app.locals.quantumIntelligenceService.archiveMemory({
      workspaceId: workspace(req),
      fieldId: req.params.fieldId,
      ancestorRef: req.body.ancestorRef,
      successorRef: req.body.successorRef,
      archive: req.body.archive || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createEconomyContract(req, res, next) {
  try {
    const result = await req.app.locals.quantumIntelligenceService.createEconomyContract({
      workspaceId: workspace(req),
      fieldId: req.params.fieldId,
      contractRef: req.body.contractRef,
      providerRef: req.body.providerRef,
      consumerRef: req.body.consumerRef,
      valuation: req.body.valuation,
      metadata: req.body.metadata || {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}
