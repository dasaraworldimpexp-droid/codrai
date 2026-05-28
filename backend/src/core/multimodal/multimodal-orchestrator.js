import { AI_TASK_TYPES } from "../../contracts/ai-task.contract.js";
import { MULTIMODAL_TASK_TYPES } from "./multimodal-types.js";

export class MultimodalOrchestrator {
  constructor({ aiRuntimeEngine, workflowEngine, cacheService, assetRepository }) {
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.workflowEngine = workflowEngine;
    this.cacheService = cacheService;
    this.assetRepository = assetRepository;
  }

  async execute(request) {
    const taskType = request.multimodalType || this.#inferType(request);
    const cacheKey = this.#cacheKey(request, taskType);
    const cached = await this.cacheService?.get?.(cacheKey);

    if (cached) {
      return { cached: true, taskType, result: cached };
    }

    if ([MULTIMODAL_TASK_TYPES.IMAGE_TO_VIDEO, MULTIMODAL_TASK_TYPES.TEXT_TO_VIDEO, MULTIMODAL_TASK_TYPES.LIVE_STREAM].includes(taskType)) {
      return this.#queueMediaWorkflow(request, taskType);
    }

    const result = await this.aiRuntimeEngine.execute({
      userId: request.userId,
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      taskType: this.#runtimeTaskType(taskType),
      intent: taskType,
      input: request.input,
      attachments: request.attachments,
      metadata: { subsystem: "multimodal", taskType },
    }, { executionMode: taskType === MULTIMODAL_TASK_TYPES.REALTIME_SPEECH ? "stream" : "queue" });

    await this.cacheService?.set?.(cacheKey, result);
    return { cached: false, taskType, result };
  }

  #queueMediaWorkflow(request, taskType) {
    return this.workflowEngine.start({
      id: request.id || `${taskType}:${Date.now()}`,
      type: "multimodal_media_pipeline",
      steps: [
        {
          id: "prepare",
          type: "ai_task",
          task: { taskType: AI_TASK_TYPES.REASONING, intent: "Prepare media generation plan", input: request.input },
        },
        {
          id: "render",
          type: "ai_task",
          dependsOn: ["prepare"],
          background: true,
          task: { taskType: this.#runtimeTaskType(taskType), intent: taskType, input: request.input, attachments: request.attachments },
          options: { executionMode: "queue" },
        },
      ],
    }, {
      userId: request.userId,
      workspaceId: request.workspaceId,
      projectId: request.projectId,
    });
  }

  #inferType(request) {
    const text = String(request.input?.text || request.goal || "").toLowerCase();
    if (/image.*video|animate|cinematic/.test(text)) return MULTIMODAL_TASK_TYPES.IMAGE_TO_VIDEO;
    if (/video/.test(text)) return MULTIMODAL_TASK_TYPES.TEXT_TO_VIDEO;
    if (/clone|voice/.test(text)) return MULTIMODAL_TASK_TYPES.VOICE_CLONING;
    if (/music|song|soundtrack/.test(text)) return MULTIMODAL_TASK_TYPES.MUSIC;
    if (/avatar/.test(text)) return MULTIMODAL_TASK_TYPES.AVATAR;
    return MULTIMODAL_TASK_TYPES.TEXT_TO_IMAGE;
  }

  #runtimeTaskType(taskType) {
    if ([MULTIMODAL_TASK_TYPES.TEXT_TO_VIDEO, MULTIMODAL_TASK_TYPES.IMAGE_TO_VIDEO, MULTIMODAL_TASK_TYPES.LIVE_STREAM].includes(taskType)) return AI_TASK_TYPES.VIDEO;
    if ([MULTIMODAL_TASK_TYPES.VOICE_CLONING, MULTIMODAL_TASK_TYPES.REALTIME_SPEECH].includes(taskType)) return AI_TASK_TYPES.VOICE;
    return AI_TASK_TYPES.IMAGE;
  }

  #cacheKey(request, taskType) {
    return ["multimodal", request.workspaceId, request.projectId, taskType, JSON.stringify(request.input || {})].join(":");
  }
}
