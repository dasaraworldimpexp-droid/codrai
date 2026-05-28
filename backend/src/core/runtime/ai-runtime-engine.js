import { EVENT_TYPES } from "../events/event-types.js";
import { RUNTIME_EXECUTION_MODES } from "./runtime-types.js";
import { randomUUID } from "node:crypto";

export class AiRuntimeEngine {
  constructor({
    contextEngine,
    promptOrchestrator,
    modelRouter,
    providerRuntime,
    streamingEngine,
    usageService,
    jobQueue,
    eventBus,
    conversationService,
  }) {
    this.contextEngine = contextEngine;
    this.promptOrchestrator = promptOrchestrator;
    this.modelRouter = modelRouter;
    this.providerRuntime = providerRuntime;
    this.streamingEngine = streamingEngine;
    this.usageService = usageService;
    this.jobQueue = jobQueue;
    this.eventBus = eventBus;
    this.conversationService = conversationService;
  }

  async execute(request, options = {}) {
    const task = this.#normalizeTask(request);

    await this.#publish(EVENT_TYPES.AI_TASK_ACCEPTED, task, { executionMode: options.executionMode });
    await this.usageService.assertCanExecute(task);

    const context = await this.contextEngine.buildContext(task);
    await this.#publish(EVENT_TYPES.AI_TASK_CONTEXT_READY, task, { contextBlockCount: context.blocks?.length || 0 });

    const orchestratedTask = await this.promptOrchestrator.compose({ task, context });
    const route = await this.modelRouter.route(orchestratedTask);
    await this.#publish(EVENT_TYPES.AI_TASK_ROUTED, task, {
      provider: route.provider.providerName,
      executionMode: route.executionMode,
    });

    const executionMode = this.#resolveExecutionMode(options.executionMode, route.executionMode);

    if (executionMode === RUNTIME_EXECUTION_MODES.QUEUE) {
      const job = await this.jobQueue.enqueueAiTask({
        task: orchestratedTask,
        route: {
          providerName: route.provider.providerName,
          executionMode: route.executionMode,
        },
      });
      await this.#publish(EVENT_TYPES.JOB_QUEUED, task, { jobId: job.id, queueName: job.queueName });
      return { mode: executionMode, taskId: task.id, job };
    }

    const reservation = await this.usageService.reserve(orchestratedTask);

    try {
      if (executionMode === RUNTIME_EXECUTION_MODES.STREAM) {
        return this.streamingEngine.streamTask({
          task: orchestratedTask,
          route,
          providerRuntime: this.providerRuntime,
          reservation,
          signal: options.signal,
        });
      }

      const result = await this.providerRuntime.execute({
        provider: route.provider,
        task: orchestratedTask,
        signal: options.signal,
        fallbackProviders: route.fallbackProviders,
      });

      await this.usageService.finalize({ reservation, result });
      await this.conversationService.persistAiResult({ task: orchestratedTask, result });
      await this.#publish(EVENT_TYPES.AI_TASK_COMPLETED, task, result);

      return { mode: executionMode, taskId: task.id, result };
    } catch (error) {
      await this.usageService.releaseReservation(reservation);
      await this.#publish(EVENT_TYPES.AI_TASK_FAILED, task, { message: error.message });
      throw error;
    }
  }

  #normalizeTask(request) {
    return {
      ...request,
      id: request.id || randomUUID(),
      createdAt: request.createdAt || new Date().toISOString(),
    };
  }

  #resolveExecutionMode(requestedMode, routeMode) {
    if (requestedMode) {
      return requestedMode;
    }

    return routeMode === "queue" ? RUNTIME_EXECUTION_MODES.QUEUE : RUNTIME_EXECUTION_MODES.SYNC;
  }

  #publish(type, task, payload) {
    return this.eventBus.publish({
      type,
      channel: `workspace:${task.workspaceId}`,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      actorId: task.userId,
      payload: { taskId: task.id, ...payload },
    });
  }
}
