import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class PresentationEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.PRESENTATION,
      projectType: "presentation",
      name: "Presentation Engine",
      description: "Creates business presentations with narrative, slides, visuals, and PPT export workflow.",
      artifacts: [CREATION_ARTIFACT_TYPES.PRESENTATION, CREATION_ARTIFACT_TYPES.MEDIA_ASSET],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "narrative", title: "Design presentation narrative", agentType: AGENT_TYPES.BUSINESS, objective: request.goal }),
        this.aiStep({ id: "slides", title: "Generate slide structure", taskType: AI_TASK_TYPES.PRESENTATION, prompt: `Generate slide-by-slide structure for: ${request.goal}`, dependsOn: ["narrative"] }),
        this.agentStep({ id: "visual-system", title: "Create visual direction", agentType: AGENT_TYPES.DESIGN, objective: request.goal, dependsOn: ["slides"] }),
      ],
    });
  }
}
