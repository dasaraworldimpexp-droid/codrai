import { EVENT_TYPES } from "../events/event-types.js";
import { WORKFLOW_STEP_STATUSES, WORKFLOW_STEP_TYPES } from "./workflow-types.js";

export class WorkflowEngine {
  constructor({ aiRuntimeEngine, multiAgentRuntime, eventBus, workflowRepository, backgroundProcessor, toolExecutionEngine }) {
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.multiAgentRuntime = multiAgentRuntime;
    this.eventBus = eventBus;
    this.workflowRepository = workflowRepository;
    this.backgroundProcessor = backgroundProcessor;
    this.toolExecutionEngine = toolExecutionEngine;
  }

  async start(workflowDefinition, runtimeContext) {
    this.#validateWorkflow(workflowDefinition);

    const run = await this.workflowRepository.createRun({
      definitionId: workflowDefinition.id,
      workspaceId: runtimeContext.workspaceId,
      projectId: runtimeContext.projectId,
      status: "running",
      steps: workflowDefinition.steps.map((step) => ({ ...step, status: WORKFLOW_STEP_STATUSES.PENDING })),
    });

    await this.eventBus.publish({
      type: EVENT_TYPES.WORKFLOW_STARTED,
      channel: `workflow:${run.id}`,
      workspaceId: runtimeContext.workspaceId,
      projectId: runtimeContext.projectId,
      payload: { runId: run.id },
    });

    return this.#executeRunnableSteps({ run, runtimeContext });
  }

  async #executeRunnableSteps({ run, runtimeContext }) {
    const completed = new Set();
    const failed = [];

    while (completed.size < run.steps.length) {
      const runnable = run.steps.filter((step) => {
        if (completed.has(step.id) || failed.includes(step.id)) return false;
        return (step.dependsOn || []).every((dependency) => completed.has(dependency));
      });

      if (runnable.length === 0) {
        throw new Error("Workflow has unresolved dependencies or failed blocking steps.");
      }

      const results = await Promise.allSettled(runnable.map((step) => this.#executeStep({ step, run, runtimeContext })));

      results.forEach((result, index) => {
        const stepId = runnable[index].id;
        if (result.status === "fulfilled") {
          completed.add(stepId);
        } else {
          failed.push(stepId);
        }
      });

      if (failed.length > 0) {
        await this.workflowRepository.markFailed(run.id, { failedStepIds: failed });
        await this.eventBus.publish({
          type: EVENT_TYPES.WORKFLOW_FAILED,
          channel: `workflow:${run.id}`,
          workspaceId: runtimeContext.workspaceId,
          projectId: runtimeContext.projectId,
          payload: { runId: run.id, failedStepIds: failed },
        });
        throw new Error(`Workflow failed at steps: ${failed.join(", ")}`);
      }
    }

    await this.workflowRepository.markCompleted(run.id);
    await this.eventBus.publish({
      type: EVENT_TYPES.WORKFLOW_COMPLETED,
      channel: `workflow:${run.id}`,
      workspaceId: runtimeContext.workspaceId,
      projectId: runtimeContext.projectId,
      payload: { runId: run.id },
    });

    return this.workflowRepository.getRun(run.id);
  }

  async #executeStep({ step, run, runtimeContext }) {
    await this.workflowRepository.markStepRunning(run.id, step.id);
    await this.eventBus.publish({
      type: EVENT_TYPES.WORKFLOW_STEP_STARTED,
      channel: `workflow:${run.id}`,
      workspaceId: runtimeContext.workspaceId,
      projectId: runtimeContext.projectId,
      payload: { runId: run.id, stepId: step.id, stepType: step.type },
    });

    const result = await this.#dispatchStep({ step, run, runtimeContext });

    await this.workflowRepository.markStepCompleted(run.id, step.id, result);
    await this.eventBus.publish({
      type: EVENT_TYPES.WORKFLOW_STEP_COMPLETED,
      channel: `workflow:${run.id}`,
      workspaceId: runtimeContext.workspaceId,
      projectId: runtimeContext.projectId,
      payload: { runId: run.id, stepId: step.id, result },
    });

    return result;
  }

  #dispatchStep({ step, run, runtimeContext }) {
    if (step.type === WORKFLOW_STEP_TYPES.AI_TASK) {
      return this.aiRuntimeEngine.execute({
        ...step.task,
        workspaceId: runtimeContext.workspaceId,
        projectId: runtimeContext.projectId,
        workflowState: { runId: run.id, stepId: step.id },
      }, step.options);
    }

    if (step.type === WORKFLOW_STEP_TYPES.AGENT_TASK) {
      return this.multiAgentRuntime.run({
        ...step.agentRun,
        workspaceId: runtimeContext.workspaceId,
        projectId: runtimeContext.projectId,
        workflowRunId: run.id,
        workflowStepId: step.id,
      });
    }

    if (step.type === WORKFLOW_STEP_TYPES.TOOL) {
      return this.toolExecutionEngine.execute({
        workspaceId: runtimeContext.workspaceId,
        projectId: runtimeContext.projectId,
        userId: runtimeContext.userId,
        toolName: step.toolName,
        input: step.input || {},
        mode: "sync",
      }, { id: runtimeContext.userId });
    }

    if (step.type === WORKFLOW_STEP_TYPES.HUMAN_APPROVAL) {
      return {
        status: "waiting_for_approval",
        prompt: step.prompt || "Human approval required.",
        approvalKey: `${run.id}:${step.id}`,
      };
    }

    if (step.async === true) {
      return this.backgroundProcessor.enqueueWorkflowStep({ step, run, runtimeContext });
    }

    return this.backgroundProcessor.executeWorkflowStep({ step, run, runtimeContext });
  }

  #validateWorkflow(workflowDefinition) {
    if (!workflowDefinition?.id || !Array.isArray(workflowDefinition.steps) || workflowDefinition.steps.length === 0) {
      throw new Error("Workflow definition requires id and at least one step.");
    }
  }
}
