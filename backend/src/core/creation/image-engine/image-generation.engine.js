import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class ImageGenerationEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.IMAGE,
      projectType: "image_generation",
      name: "Image Generation Engine",
      description: "Runs text-to-image, image-to-image, editing, enhancement, and upscaling through async media queues.",
      artifacts: [CREATION_ARTIFACT_TYPES.MEDIA_ASSET],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.aiStep({ id: "prompt-plan", title: "Optimize image prompt", taskType: AI_TASK_TYPES.REASONING, prompt: `Optimize image generation prompt and parameters for: ${request.goal}` }),
        this.aiStep({ id: "render", title: "Render image asset", taskType: AI_TASK_TYPES.IMAGE, prompt: request.goal, dependsOn: ["prompt-plan"], background: true }),
        this.aiStep({ id: "enhance", title: "Enhance and upscale image", taskType: AI_TASK_TYPES.IMAGE, prompt: `Enhance/upscale result for: ${request.goal}`, dependsOn: ["render"], background: true }),
      ],
    });
  }
}
