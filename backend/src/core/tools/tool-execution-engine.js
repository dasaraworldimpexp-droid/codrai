import { randomUUID } from "node:crypto";
import { EVENT_TYPES } from "../events/event-types.js";
import { TOOL_EXECUTION_MODES, TOOL_EXECUTION_STATUSES } from "./tool-types.js";

export class ToolExecutionEngine {
  constructor({
    toolRegistry,
    permissionService,
    sandboxPolicy,
    backgroundProcessor,
    eventBus,
    executionRepository,
    auditLogger,
  }) {
    this.toolRegistry = toolRegistry;
    this.permissionService = permissionService;
    this.sandboxPolicy = sandboxPolicy;
    this.backgroundProcessor = backgroundProcessor;
    this.eventBus = eventBus;
    this.executionRepository = executionRepository;
    this.auditLogger = auditLogger;
  }

  async execute(request, actor) {
    const execution = {
      id: request.id || randomUUID(),
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      userId: request.userId,
      toolName: request.toolName,
      input: request.input,
      mode: request.mode || TOOL_EXECUTION_MODES.QUEUE,
      status: TOOL_EXECUTION_STATUSES.ACCEPTED,
      createdAt: new Date().toISOString(),
    };

    const tool = this.toolRegistry.get(request.toolName);
    this.sandboxPolicy.assertAllowed(tool.manifest);

    const authorization = await this.permissionService.authorize({ tool, request, actor });
    if (authorization.requiresApproval) {
      await this.executionRepository?.save?.({ ...execution, status: TOOL_EXECUTION_STATUSES.WAITING_FOR_APPROVAL, approval: authorization.approval });
      return { ...execution, status: TOOL_EXECUTION_STATUSES.WAITING_FOR_APPROVAL, approval: authorization.approval };
    }

    await this.executionRepository?.save?.(execution);
    await this.#publish(execution, "tool.execution.accepted", {});

    if (execution.mode === TOOL_EXECUTION_MODES.QUEUE || tool.manifest.async === true) {
      const job = await this.backgroundProcessor.enqueue({
        queueName: tool.manifest.queueName || `tools.${tool.manifest.name}`,
        workspaceId: execution.workspaceId,
        projectId: execution.projectId,
        kind: "tool_execution",
        payload: { executionId: execution.id, request, toolManifest: tool.manifest },
        idempotencyKey: execution.id,
      });

      await this.executionRepository?.updateStatus?.(execution.id, TOOL_EXECUTION_STATUSES.QUEUED, { jobId: job.id });
      await this.#publish(execution, "tool.execution.queued", { jobId: job.id });
      return { ...execution, status: TOOL_EXECUTION_STATUSES.QUEUED, job };
    }

    return this.#runNow({ execution, tool, request, actor });
  }

  async cancel(executionId, actor) {
    const execution = await this.executionRepository.getById(executionId);
    await this.executionRepository.updateStatus(executionId, TOOL_EXECUTION_STATUSES.CANCELLED, { cancelledBy: actor?.id });
    await this.#publish(execution, "tool.execution.cancelled", { cancelledBy: actor?.id });
    return { executionId, status: TOOL_EXECUTION_STATUSES.CANCELLED };
  }

  async #runNow({ execution, tool, request, actor }) {
    await this.executionRepository?.updateStatus?.(execution.id, TOOL_EXECUTION_STATUSES.RUNNING);
    await this.#publish(execution, "tool.execution.running", {});

    try {
      const result = await tool.handler.execute({
        input: request.input,
        actor,
        workspaceId: request.workspaceId,
        projectId: request.projectId,
        executionId: execution.id,
      });

      await this.executionRepository?.complete?.(execution.id, result);
      await this.auditLogger?.record?.({
        workspaceId: request.workspaceId,
        actorId: actor?.id,
        action: "tool.execution.completed",
        metadata: { toolName: tool.manifest.name, executionId: execution.id },
      });
      await this.#publish(execution, "tool.execution.completed", { result });
      return { ...execution, status: TOOL_EXECUTION_STATUSES.COMPLETED, result };
    } catch (error) {
      await this.executionRepository?.fail?.(execution.id, { message: error.message });
      await this.#publish(execution, "tool.execution.failed", { message: error.message });
      throw error;
    }
  }

  #publish(execution, type, payload) {
    return this.eventBus.publish({
      type,
      channel: `project:${execution.projectId || execution.workspaceId}`,
      workspaceId: execution.workspaceId,
      projectId: execution.projectId,
      payload: { executionId: execution.id, toolName: execution.toolName, ...payload },
    });
  }
}
