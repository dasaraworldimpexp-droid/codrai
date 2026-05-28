function workspace(req) {
  return req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
}

export async function createAiStudioMediaJob(req, res, next) {
  try {
    const job = await req.app.locals.aiStudioService.createMediaJob({
      workspaceId: workspace(req),
      userId: req.user?.id,
      projectId: req.body.projectId,
      mediaType: req.body.mediaType,
      mode: req.body.mode,
      prompt: req.body.prompt,
      input: req.body.input || {},
    });
    return res.status(job.status === "blocked" ? 202 : 201).json({ job });
  } catch (error) {
    return next(error);
  }
}

export async function listAiStudioMediaJobs(req, res, next) {
  try {
    const jobs = await req.app.locals.aiStudioService.listMediaJobs({
      workspaceId: workspace(req),
      limit: req.query.limit,
    });
    return res.status(200).json({ jobs });
  } catch (error) {
    return next(error);
  }
}

export async function getAiStudioMediaJob(req, res, next) {
  try {
    const job = await req.app.locals.aiStudioService.getMediaJob({
      workspaceId: workspace(req),
      jobId: req.params.jobId,
    });
    return res.status(200).json({ job });
  } catch (error) {
    return next(error);
  }
}

export async function aiStudioTemplates(req, res, next) {
  try {
    const templates = await req.app.locals.aiStudioService.templates({ workspaceId: workspace(req) });
    return res.status(200).json({ templates });
  } catch (error) {
    return next(error);
  }
}

export async function aiStudioReadiness(req, res, next) {
  try {
    const readiness = await req.app.locals.aiStudioService.readiness({ workspaceId: workspace(req) });
    return res.status(200).json(readiness);
  } catch (error) {
    return next(error);
  }
}
