import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class VideoGenerationEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.VIDEO,
      projectType: "video_generation",
      name: "Video Generation Engine",
      description: "Runs script, storyboard, image-to-video, text-to-video, cinematic rendering, and progress-tracked media pipelines.",
      artifacts: [CREATION_ARTIFACT_TYPES.MEDIA_ASSET, CREATION_ARTIFACT_TYPES.DOCUMENT],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "script", title: "Create video script and storyboard", agentType: AGENT_TYPES.VIDEO, objective: request.goal }),
        this.aiStep({ id: "keyframes", title: "Generate visual keyframes", taskType: AI_TASK_TYPES.IMAGE, prompt: `Generate keyframes for video: ${request.goal}`, dependsOn: ["script"], background: true }),
        this.aiStep({ id: "render-video", title: "Render video", taskType: AI_TASK_TYPES.VIDEO, prompt: request.goal, dependsOn: ["keyframes"], background: true }),
      ],
    });
  }
}
