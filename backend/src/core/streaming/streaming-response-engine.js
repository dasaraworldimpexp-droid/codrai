import { EVENT_TYPES } from "../events/event-types.js";

export class StreamingResponseEngine {
  constructor({ eventBus, conversationService, usageService }) {
    this.eventBus = eventBus;
    this.conversationService = conversationService;
    this.usageService = usageService;
  }

  async streamTask({ task, route, providerRuntime, reservation, signal }) {
    let fullText = "";
    let finalUsage = null;
    let finalProvider = route.provider.providerName;

    await this.eventBus.publish({
      type: EVENT_TYPES.AI_TASK_PROGRESS,
      channel: `conversation:${task.conversationId || task.id}`,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      payload: { taskId: task.id, status: "streaming" },
    });

    for await (const chunk of providerRuntime.stream({
      provider: route.provider,
      fallbackProviders: route.fallbackProviders || [],
      task,
      signal,
    })) {
      finalProvider = chunk.providerName || finalProvider;

      if (chunk.text) {
        fullText += chunk.text;
      }

      if (chunk.usage) {
        finalUsage = chunk.usage;
      }

      await this.eventBus.publish({
        type: EVENT_TYPES.AI_TASK_STREAM_TOKEN,
        channel: `conversation:${task.conversationId || task.id}`,
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        payload: { taskId: task.id, chunk },
      });
    }

    const result = {
      taskId: task.id,
      provider: finalProvider,
      model: task.model || null,
      output: { text: fullText },
      usage: finalUsage,
      taskType: task.taskType,
      completedAt: new Date().toISOString(),
    };

    await this.usageService.finalize({ reservation, result });
    await this.conversationService.persistAiResult({ task, result });

    await this.eventBus.publish({
      type: EVENT_TYPES.AI_TASK_COMPLETED,
      channel: `conversation:${task.conversationId || task.id}`,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      payload: result,
    });

    return result;
  }
}
