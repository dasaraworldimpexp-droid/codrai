export class ProjectVersioningService {
  constructor({ versionRepository, storageService }) {
    this.versionRepository = versionRepository;
    this.storageService = storageService;
  }

  async createVersion({ workspaceId, projectId, userId, artifacts, message }) {
    const storedArtifacts = await Promise.all((artifacts || []).map((artifact) => this.storageService.storeArtifact({ workspaceId, projectId, artifact })));
    return this.versionRepository.create({
      workspaceId,
      projectId,
      userId,
      message,
      artifacts: storedArtifacts,
      createdAt: new Date().toISOString(),
    });
  }

  async recover({ workspaceId, projectId, versionId }) {
    return this.versionRepository.restore({ workspaceId, projectId, versionId });
  }
}
