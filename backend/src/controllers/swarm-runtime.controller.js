const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
const user = (req) => req.user?.id || req.body.userId;

export async function createSwarmCluster(req, res, next) {
  try {
    const cluster = await req.app.locals.swarmRuntimeService.createCluster({
      workspaceId: workspace(req),
      userId: user(req),
      name: req.body.name,
      objective: req.body.objective,
      routingPolicy: req.body.routingPolicy,
      consensusPolicy: req.body.consensusPolicy,
    });
    return res.status(201).json({ cluster });
  } catch (error) {
    return next(error);
  }
}

export async function listSwarmClusters(req, res, next) {
  try {
    const clusters = await req.app.locals.swarmRuntimeService.listClusters({ workspaceId: workspace(req) });
    return res.status(200).json({ clusters });
  } catch (error) {
    return next(error);
  }
}

export async function joinSwarmCluster(req, res, next) {
  try {
    const topology = await req.app.locals.swarmRuntimeService.joinCluster({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
      nodeId: req.body.nodeId,
      role: req.body.role,
      capabilities: req.body.capabilities,
    });
    return res.status(202).json(topology);
  } catch (error) {
    return next(error);
  }
}

export async function negotiateSwarmCapabilities(req, res, next) {
  try {
    const node = await req.app.locals.swarmRuntimeService.negotiateCapabilities({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
      nodeId: req.body.nodeId,
      capabilities: req.body.capabilities,
      loadScore: req.body.loadScore,
      metadata: req.body.metadata,
    });
    return res.status(202).json({ node });
  } catch (error) {
    return next(error);
  }
}

export async function swarmTopology(req, res, next) {
  try {
    const topology = await req.app.locals.swarmRuntimeService.topology({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
    });
    return res.status(200).json(topology);
  } catch (error) {
    return next(error);
  }
}

export async function sendSwarmMessage(req, res, next) {
  try {
    const messages = await req.app.locals.swarmRuntimeService.sendMessage({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
      fromAgent: req.body.fromAgent,
      toAgent: req.body.toAgent,
      messageType: req.body.messageType,
      content: req.body.content,
      metadata: req.body.metadata,
    });
    return res.status(201).json(messages);
  } catch (error) {
    return next(error);
  }
}

export async function proposeSwarmConsensus(req, res, next) {
  try {
    const consensus = await req.app.locals.swarmRuntimeService.proposeConsensus({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
      userId: user(req),
      proposal: req.body.proposal,
    });
    return res.status(201).json(consensus);
  } catch (error) {
    return next(error);
  }
}

export async function voteSwarmConsensus(req, res, next) {
  try {
    const consensus = await req.app.locals.swarmRuntimeService.voteConsensus({
      workspaceId: workspace(req),
      consensusId: req.params.consensusId,
      voter: req.body.voter,
      vote: req.body.vote,
      rationale: req.body.rationale,
    });
    return res.status(202).json(consensus);
  } catch (error) {
    return next(error);
  }
}

export async function federateSwarmTask(req, res, next) {
  try {
    const federation = await req.app.locals.swarmRuntimeService.federateTask({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
      userId: user(req),
      rootTaskId: req.body.rootTaskId,
      strategy: req.body.strategy,
      tasks: req.body.tasks,
    });
    return res.status(201).json({ federation });
  } catch (error) {
    return next(error);
  }
}

export async function migrateSwarmTask(req, res, next) {
  try {
    const task = await req.app.locals.swarmRuntimeService.migrateTask({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
      taskId: req.body.taskId,
      targetNodeId: req.body.targetNodeId,
      userId: user(req),
    });
    return res.status(202).json({ task });
  } catch (error) {
    return next(error);
  }
}

export async function replicateSwarmMemory(req, res, next) {
  try {
    const replication = await req.app.locals.swarmRuntimeService.replicateMemory({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
      sourceTaskId: req.body.sourceTaskId,
      sourceNodeId: req.body.sourceNodeId,
      targetNodeId: req.body.targetNodeId,
      memoryType: req.body.memoryType,
      memory: req.body.memory,
    });
    return res.status(201).json({ replication });
  } catch (error) {
    return next(error);
  }
}

export async function recoverSwarmCluster(req, res, next) {
  try {
    const recovery = await req.app.locals.swarmRuntimeService.recoverCluster({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
      userId: user(req),
    });
    return res.status(202).json(recovery);
  } catch (error) {
    return next(error);
  }
}

export async function optimizeSwarmCluster(req, res, next) {
  try {
    const optimization = await req.app.locals.swarmRuntimeService.optimizeCluster({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
    });
    return res.status(202).json({ optimization });
  } catch (error) {
    return next(error);
  }
}

export async function swarmAnalytics(req, res, next) {
  try {
    const analytics = await req.app.locals.swarmRuntimeService.analytics({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
    });
    return res.status(200).json(analytics);
  } catch (error) {
    return next(error);
  }
}

export async function swarmEvents(req, res, next) {
  try {
    const events = await req.app.locals.swarmRuntimeService.events({
      workspaceId: workspace(req),
      clusterId: req.params.clusterId,
      limit: Number(req.query.limit || 80),
    });
    return res.status(200).json(events);
  } catch (error) {
    return next(error);
  }
}
