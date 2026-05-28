export async function startMission(req, res, next) {
  try {
    const mission = await req.app.locals.missionControlService.start({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      title: req.body.title,
      objective: req.body.objective,
      priority: req.body.priority,
      mode: req.body.mode,
      parentMissionId: req.body.parentMissionId,
      dependsOn: req.body.dependsOn || [],
    });
    return res.status(202).json({ mission });
  } catch (error) {
    return next(error);
  }
}

export async function pauseMission(req, res, next) {
  try {
    const mission = await req.app.locals.missionControlService.pause({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      id: req.params.missionId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(200).json({ mission });
  } catch (error) {
    return next(error);
  }
}

export async function resumeMission(req, res, next) {
  try {
    const mission = await req.app.locals.missionControlService.resume({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      id: req.params.missionId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json({ mission });
  } catch (error) {
    return next(error);
  }
}

export async function replayMission(req, res, next) {
  try {
    const mission = await req.app.locals.missionControlService.replay({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      id: req.params.missionId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json({ mission });
  } catch (error) {
    return next(error);
  }
}

export async function missionGraph(req, res, next) {
  try {
    const graph = await req.app.locals.missionControlService.graph({
      workspaceId: req.workspace?.id || req.query.workspaceId,
    });
    return res.status(200).json(graph);
  } catch (error) {
    return next(error);
  }
}

export async function listMissions(req, res, next) {
  try {
    const missions = await req.app.locals.missionControlService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 30),
    });
    return res.status(200).json({ missions });
  } catch (error) {
    return next(error);
  }
}
