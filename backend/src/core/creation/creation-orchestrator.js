import { randomUUID } from "node:crypto";
import { EVENT_TYPES } from "../events/event-types.js";

export class CreationOrchestrator {
  constructor({ engineRegistry, workflowEngine, projectRepository, eventBus, memoryOrchestrator }) {
    this.engineRegistry = engineRegistry;
    this.workflowEngine = workflowEngine;
    this.projectRepository = projectRepository;
    this.eventBus = eventBus;
    this.memoryOrchestrator = memoryOrchestrator;
  }

  async create(request) {
    const engine = this.engineRegistry.get(request.engineType);
    const project = await this.#resolveProject(request, engine);
    const memoryContext = await this.memoryOrchestrator?.retrieveForAutonomousGoal?.({
      ...request,
      projectId: project.id,
      objective: request.goal,
    });

    const workflowDefinition = await engine.createWorkflow({
      ...request,
      project,
      memoryContext,
      runId: request.runId || randomUUID(),
    });

    await this.eventBus.publish({
      type: EVENT_TYPES.WORKFLOW_STARTED,
      channel: `project:${project.id}`,
      workspaceId: request.workspaceId,
      projectId: project.id,
      actorId: request.userId,
      payload: {
        engineType: request.engineType,
        workflowId: workflowDefinition.id,
        phase: "creation_workflow_ready",
      },
    });

    const run = await this.workflowEngine.start(workflowDefinition, {
      userId: request.userId,
      workspaceId: request.workspaceId,
      projectId: project.id,
    });

    return {
      project,
      workflowDefinition,
      run,
    };
  }

  async #resolveProject(request, engine) {
    if (request.projectId) {
      return this.projectRepository.getById(request.projectId);
    }

    return this.projectRepository.create({
      workspaceId: request.workspaceId,
      ownerId: request.userId,
      type: engine.projectType,
      name: request.projectName || engine.defaultProjectName(request),
      goal: request.goal,
      status: "active",
    });
  }
}
