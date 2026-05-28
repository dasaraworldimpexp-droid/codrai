export class ExportPackagingService {
  constructor({ storageService, jobQueue }) {
    this.storageService = storageService;
    this.jobQueue = jobQueue;
  }

  async requestExport({ workspaceId, projectId, userId, format, artifactIds }) {
    return this.jobQueue.enqueue({
      queueName: "exports.render",
      workspaceId,
      projectId,
      kind: "project_export",
      payload: { userId, format, artifactIds },
      idempotencyKey: `export:${projectId}:${format}:${artifactIds.join(",")}`,
    });
  }
}
