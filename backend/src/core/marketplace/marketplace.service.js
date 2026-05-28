import { validatePluginManifest } from "./plugins/plugin-manifest.schema.js";

export class MarketplaceService {
  constructor({ extensionRepository, installationRepository, reviewRepository, securityOrchestrator, eventBus }) {
    this.extensionRepository = extensionRepository;
    this.installationRepository = installationRepository;
    this.reviewRepository = reviewRepository;
    this.securityOrchestrator = securityOrchestrator;
    this.eventBus = eventBus;
  }

  listExtensions(filter = {}) {
    return this.extensionRepository.find(filter);
  }

  listInstallations({ workspaceId }) {
    if (!workspaceId) throw new Error("workspaceId is required.");
    return this.installationRepository.list({ workspaceId });
  }

  async publishExtension(manifest, actor) {
    validatePluginManifest(manifest);
    await this.securityOrchestrator?.assertAllowed?.({
      operation: { id: manifest.id, userId: actor?.id, workspaceId: actor?.workspaceId, intent: "publish_extension" },
      actor,
    });
    return this.extensionRepository.upsert(manifest);
  }

  async install({ workspaceId, extensionId, userId }) {
    const extension = await this.extensionRepository.getById(extensionId);
    if (!extension) throw new Error(`Extension not found: ${extensionId}`);

    const installation = await this.installationRepository.install({
      workspaceId,
      extensionId,
      userId,
      permissions: extension.permissions,
      installedAt: new Date().toISOString(),
    });

    await this.eventBus?.publish?.({
      type: "marketplace.extension.installed",
      channel: `workspace:${workspaceId}`,
      workspaceId,
      actorId: userId,
      payload: { extensionId, installationId: installation.id, status: installation.status || "installed" },
    });

    return installation;
  }

  async review({ workspaceId, extensionId, userId, rating, review }) {
    const result = await this.reviewRepository.review({ workspaceId, extensionId, userId, rating, review });
    await this.eventBus?.publish?.({
      type: "marketplace.extension.reviewed",
      channel: `workspace:${workspaceId}`,
      workspaceId,
      actorId: userId,
      payload: { extensionId, rating },
    });
    return result;
  }

  handleRequest(request) {
    if (request.action === "install") {
      return this.install({ workspaceId: request.workspaceId, extensionId: request.extensionId, userId: request.userId });
    }
    return this.listExtensions(request.filter);
  }
}
