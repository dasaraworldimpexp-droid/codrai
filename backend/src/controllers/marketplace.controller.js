export async function listExtensions(req, res, next) {
  try {
    const marketplaceService = req.app.locals.marketplaceService;
    if (!marketplaceService) return res.status(503).json({ message: "Marketplace service is not configured." });
    const timeoutMs = Number(process.env.MARKETPLACE_LIST_TIMEOUT_MS || 5000);
    const timeout = new Promise((resolve) => {
      setTimeout(() => resolve({ status: "degraded", extensions: [], message: "Marketplace registry timed out; returning degraded empty registry." }), timeoutMs);
    });
    const result = await Promise.race([
      Promise.resolve(marketplaceService.listExtensions(req.query)).then((extensions) => ({ status: "ok", extensions })),
      timeout,
    ]);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function installExtension(req, res, next) {
  try {
    const marketplaceService = req.app.locals.marketplaceService;
    if (!marketplaceService) return res.status(503).json({ message: "Marketplace service is not configured." });
    const installation = await marketplaceService.install({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      extensionId: req.body.extensionId,
      userId: req.user?.id || req.body.userId,
    });
    return res.status(202).json(installation);
  } catch (error) {
    return next(error);
  }
}

export async function listInstallations(req, res, next) {
  try {
    const marketplaceService = req.app.locals.marketplaceService;
    if (!marketplaceService) return res.status(503).json({ message: "Marketplace service is not configured." });
    const workspaceId = req.workspace?.id || req.query.workspaceId || "local-workspace";
    const installations = await marketplaceService.listInstallations({ workspaceId });
    return res.status(200).json({ status: "ok", workspaceId, installations });
  } catch (error) {
    return next(error);
  }
}

export async function reviewExtension(req, res, next) {
  try {
    const marketplaceService = req.app.locals.marketplaceService;
    if (!marketplaceService) return res.status(503).json({ message: "Marketplace service is not configured." });
    const review = await marketplaceService.review({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      extensionId: req.params.extensionId,
      userId: req.user?.id || req.body.userId,
      rating: req.body.rating,
      review: req.body.review,
    });
    return res.status(201).json(review);
  } catch (error) {
    return next(error);
  }
}
