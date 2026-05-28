export async function createTeam(req, res, next) {
  try {
    const team = await req.app.locals.aiTeamService.create({
      ...req.body,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(201).json({ team });
  } catch (error) {
    return next(error);
  }
}

export async function listTeams(req, res, next) {
  try {
    const teams = await req.app.locals.aiTeamService.list({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ teams });
  } catch (error) {
    return next(error);
  }
}

export async function sendTeamMessage(req, res, next) {
  try {
    const result = await req.app.locals.aiTeamService.message({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      teamId: req.params.teamId,
      fromAgent: req.body.fromAgent,
      toAgent: req.body.toAgent,
      content: req.body.content,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
