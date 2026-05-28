export class LivePreviewService {
  constructor({ eventBus, previewRepository }) {
    this.eventBus = eventBus;
    this.previewRepository = previewRepository;
  }

  async publishPreview({ workspaceId, projectId, preview }) {
    const record = await this.previewRepository.save({ workspaceId, projectId, preview, updatedAt: new Date().toISOString() });
    await this.eventBus.publish({
      type: "builder.preview.updated",
      channel: `project:${projectId}`,
      workspaceId,
      projectId,
      payload: { previewId: record.id, status: record.status },
    });
    return record;
  }
}
