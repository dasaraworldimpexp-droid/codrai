import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class GameBuilderEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.GAME,
      projectType: "game",
      name: "Game Builder",
      description: "Creates 2D/3D game architecture, mechanics, scenes, character plans, and AI asset workflows.",
      artifacts: [CREATION_ARTIFACT_TYPES.SOURCE_CODE, CREATION_ARTIFACT_TYPES.MEDIA_ASSET, CREATION_ARTIFACT_TYPES.UI_DESIGN],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "game-design", title: "Design game mechanics", agentType: AGENT_TYPES.DESIGN, objective: request.goal }),
        this.aiStep({ id: "game-code", title: "Generate game code architecture", taskType: AI_TASK_TYPES.GAME, prompt: `Create game architecture, scenes, loops, and interaction systems for: ${request.goal}`, dependsOn: ["game-design"] }),
        this.aiStep({ id: "assets", title: "Generate game asset prompts", taskType: AI_TASK_TYPES.IMAGE, prompt: `Create production prompts and asset list for game: ${request.goal}`, dependsOn: ["game-design"], background: true }),
      ],
    });
  }
}
