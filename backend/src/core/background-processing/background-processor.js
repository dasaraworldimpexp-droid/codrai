import { EVENT_TYPES } from "../events/event-types.js";
import { AI_TASK_TYPES } from "../../contracts/ai-task.contract.js";
import { QUEUE_NAMES } from "../queues/queue-names.js";

export class BackgroundProcessor {
  constructor({ queueAdapter, eventBus, jobRepository, workflowStepHandlers = new Map() }) {
    this.queueAdapter = queueAdapter;
    this.eventBus = eventBus;
    this.jobRepository = jobRepository;
    this.workflowStepHandlers = workflowStepHandlers;
  }

  async enqueueAiTask({ task, route }) {
    return this.enqueue({
      queueName: this.#queueForTask(task),
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      kind: "ai_task",
      payload: { task, route },
      idempotencyKey: task.id,
    });
  }

  async enqueueWorkflowStep({ step, run, runtimeContext }) {
    return this.enqueue({
      queueName: `workflow.${step.type}`,
      workspaceId: runtimeContext.workspaceId,
      projectId: runtimeContext.projectId,
      kind: "workflow_step",
      payload: { step, runId: run.id, runtimeContext },
      idempotencyKey: `${run.id}:${step.id}`,
    });
  }

  async enqueueScheduledTask(scheduledTask) {
    return this.enqueue({
      queueName: scheduledTask.queueName,
      workspaceId: scheduledTask.workspaceId,
      projectId: scheduledTask.projectId,
      kind: "scheduled_task",
      payload: scheduledTask.payload,
      idempotencyKey: `${scheduledTask.id}:${scheduledTask.nextRunAt}`,
    });
  }

  async enqueue(jobInput) {
    const job = await this.jobRepository.create({
      ...jobInput,
      status: "queued",
      createdAt: new Date().toISOString(),
    });

    await this.queueAdapter.add(job.queueName, {
      jobId: job.id,
      payload: job.payload,
      idempotencyKey: job.idempotencyKey,
    });

    await this.eventBus.publish({
      type: EVENT_TYPES.JOB_QUEUED,
      channel: `job:${job.id}`,
      workspaceId: job.workspaceId,
      projectId: job.projectId,
      payload: { jobId: job.id, queueName: job.queueName },
    });

    return job;
  }

  async executeWorkflowStep({ step, run, runtimeContext }) {
    const handler = this.workflowStepHandlers.get(step.type);

    if (!handler) {
      throw new Error(`No workflow step handler registered for step type: ${step.type}`);
    }

    return handler.execute({ step, run, runtimeContext });
  }

  #queueForTask(task) {
    const queueByTaskType = {
      [AI_TASK_TYPES.CODING]: QUEUE_NAMES.AI_TEXT,
      [AI_TASK_TYPES.REASONING]: QUEUE_NAMES.AI_TEXT,
      [AI_TASK_TYPES.RESEARCH]: QUEUE_NAMES.AI_TEXT,
      [AI_TASK_TYPES.DOCUMENT]: QUEUE_NAMES.DOCUMENT_GENERATION,
      [AI_TASK_TYPES.PRESENTATION]: QUEUE_NAMES.PRESENTATION_GENERATION,
      [AI_TASK_TYPES.IMAGE]: QUEUE_NAMES.AI_IMAGE,
      [AI_TASK_TYPES.VIDEO]: QUEUE_NAMES.AI_VIDEO,
      [AI_TASK_TYPES.VOICE]: QUEUE_NAMES.AI_VOICE,
      [AI_TASK_TYPES.AUTOMATION]: QUEUE_NAMES.AGENT_EXECUTION,
      [AI_TASK_TYPES.ECOMMERCE]: QUEUE_NAMES.ECOMMERCE_SYNC,
      [AI_TASK_TYPES.GAME]: QUEUE_NAMES.AGENT_EXECUTION,
      [AI_TASK_TYPES.EDUCATION]: QUEUE_NAMES.AI_TEXT,
    };

    return queueByTaskType[task.taskType] || QUEUE_NAMES.AI_TEXT;
  }
}
