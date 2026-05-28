import { EVENT_TYPES } from "../events/event-types.js";
import { AGENT_MESSAGE_TYPES, AGENT_RUN_STATUSES } from "./agent-types.js";

export class MultiAgentRuntime {
  constructor({
    agentRegistry,
    agentProfileRegistry,
    agentRunRepository,
    eventBus,
    memoryService,
    taskQueue,
    planningEngine,
    collaborationBus,
    permissionService,
    emotionalIntelligenceEngine,
    performanceScorer,
  }) {
    this.agentRegistry = agentRegistry;
    this.agentProfileRegistry = agentProfileRegistry;
    this.agentRunRepository = agentRunRepository;
    this.eventBus = eventBus;
    this.memoryService = memoryService;
    this.taskQueue = taskQueue;
    this.planningEngine = planningEngine;
    this.collaborationBus = collaborationBus;
    this.permissionService = permissionService;
    this.emotionalIntelligenceEngine = emotionalIntelligenceEngine;
    this.performanceScorer = performanceScorer;
  }

  async run(request) {
    const startedAt = Date.now();
    const run = await this.agentRunRepository.create({
      ...request,
      status: AGENT_RUN_STATUSES.PLANNING,
      startedAt: new Date().toISOString(),
    });

    await this.#publish(EVENT_TYPES.AGENT_RUN_STARTED, run, { objective: request.objective });

    const leadAgent = await this.agentRegistry.getLeadAgent(request.leadAgentType || "architect_agent");
    const emotionalContext = request.emotionalContext || await this.emotionalIntelligenceEngine?.analyze?.({
      text: request.objective,
      userId: request.userId,
      workspaceId: request.workspaceId,
      conversationId: request.conversationId,
    });
    const sharedMemory = request.memoryContext || await this.memoryService.retrieveForAgentRun(run);
    const plan = request.plan || await this.planningEngine?.createPlan?.({
      run,
      objective: request.objective,
      memoryContext: sharedMemory,
      emotionalContext,
    }) || await leadAgent.plan({ run, sharedMemory, emotionalContext });

    await this.agentRunRepository.savePlan(run.id, plan);

    const delegatedResults = [];

    for (const task of plan.tasks) {
      const specialist = await this.agentRegistry.getAgent(task.agentType);
      const agentProfile = await this.#getAgentProfile(task.agentType);
      const permission = await this.permissionService?.assertCanExecute?.({ agentProfile, task, run });

      if (permission?.requiresApproval) {
        await this.agentRunRepository.appendStep(run.id, {
          task,
          status: AGENT_RUN_STATUSES.WAITING_FOR_APPROVAL,
          approval: permission.approval,
        });

        await this.#publish(EVENT_TYPES.AGENT_APPROVAL_REQUIRED, run, {
          taskId: task.id,
          agentType: task.agentType,
          approval: permission.approval,
        });

        delegatedResults.push({
          taskId: task.id,
          status: AGENT_RUN_STATUSES.WAITING_FOR_APPROVAL,
          approval: permission.approval,
        });
        continue;
      }

      if (task.background === true) {
        const queued = await this.taskQueue.enqueueAgentTask({ run, task });
        delegatedResults.push(queued);
        continue;
      }

      await this.collaborationBus?.send?.({
        runId: run.id,
        workspaceId: run.workspaceId,
        projectId: run.projectId,
        fromAgent: leadAgent.type,
        toAgent: specialist.type,
        type: AGENT_MESSAGE_TYPES.DELEGATION,
        content: task.objective || task.title,
        taskId: task.id,
        metadata: { task },
      });

      const result = await specialist.execute({
        run,
        task,
        sharedMemory,
        emotionalContext,
        agentProfile,
        sendMessage: (message) => this.collaborationBus?.send?.({
          runId: run.id,
          workspaceId: run.workspaceId,
          projectId: run.projectId,
          fromAgent: specialist.type,
          ...message,
        }),
      });

      delegatedResults.push(result);
      await this.agentRunRepository.appendStep(run.id, { task, result });
      await this.#publish(EVENT_TYPES.AGENT_STEP_COMPLETED, run, { taskId: task.id, result });
    }

    const finalResult = await leadAgent.synthesize({ run, plan, delegatedResults, sharedMemory });
    await this.agentRunRepository.complete(run.id, finalResult);
    const score = await this.performanceScorer?.scoreRun?.({
      run,
      plan,
      result: { ...finalResult, status: AGENT_RUN_STATUSES.COMPLETED },
      metrics: {
        latencyMs: Date.now() - startedAt,
        retryCount: delegatedResults.reduce((count, result) => count + (result.retryCount || 0), 0),
        cost: delegatedResults.reduce((sum, result) => sum + (result.cost || 0), 0),
      },
    });
    await this.#publish(EVENT_TYPES.AGENT_RUN_COMPLETED, run, { result: finalResult });

    return {
      runId: run.id,
      status: AGENT_RUN_STATUSES.COMPLETED,
      result: finalResult,
      score,
    };
  }

  async #getAgentProfile(agentType) {
    const profile = await this.agentProfileRegistry?.get?.(agentType);

    if (!profile) {
      throw new Error(`No agent profile registered for ${agentType}`);
    }

    return profile;
  }

  #publish(type, run, payload) {
    return this.eventBus.publish({
      type,
      channel: `agent:${run.id}`,
      workspaceId: run.workspaceId,
      projectId: run.projectId,
      actorId: run.userId,
      payload: { runId: run.id, ...payload },
    });
  }
}
