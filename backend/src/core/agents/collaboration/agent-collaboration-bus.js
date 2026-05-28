import { randomUUID } from "node:crypto";
import { EVENT_TYPES } from "../../events/event-types.js";

export class AgentCollaborationBus {
  constructor({ eventBus, messageRepository }) {
    this.eventBus = eventBus;
    this.messageRepository = messageRepository;
  }

  async send(message) {
    const normalizedMessage = {
      id: message.id || randomUUID(),
      runId: message.runId,
      workspaceId: message.workspaceId,
      projectId: message.projectId,
      fromAgent: message.fromAgent,
      toAgent: message.toAgent,
      type: message.type,
      content: message.content,
      taskId: message.taskId,
      metadata: message.metadata || {},
      createdAt: new Date().toISOString(),
    };

    if (!normalizedMessage.runId || !normalizedMessage.workspaceId || !normalizedMessage.fromAgent || !normalizedMessage.type) {
      throw new Error("Agent collaboration message requires runId, workspaceId, fromAgent, and type.");
    }

    await this.messageRepository?.append?.(normalizedMessage);

    await this.eventBus.publish({
      type: EVENT_TYPES.AGENT_MESSAGE,
      channel: `agent:${normalizedMessage.runId}`,
      workspaceId: normalizedMessage.workspaceId,
      projectId: normalizedMessage.projectId,
      payload: normalizedMessage,
    });

    return normalizedMessage;
  }

  async history(runId) {
    return this.messageRepository?.findByRunId?.(runId) || [];
  }
}
