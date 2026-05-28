import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class WebsiteBuilderEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.WEBSITE,
      projectType: "website",
      name: "Website Builder",
      description: "Creates conversion-focused websites with UX, copy, responsive UI, assets, SEO, and deployment plan.",
      artifacts: [CREATION_ARTIFACT_TYPES.UI_DESIGN, CREATION_ARTIFACT_TYPES.SOURCE_CODE, CREATION_ARTIFACT_TYPES.DEPLOYMENT_PLAN],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "strategy", title: "Define website strategy", agentType: AGENT_TYPES.MARKETING, objective: request.goal }),
        this.agentStep({ id: "design", title: "Design website UX/UI", agentType: AGENT_TYPES.DESIGN, objective: request.goal, dependsOn: ["strategy"] }),
        this.aiStep({ id: "frontend", title: "Generate website frontend", taskType: AI_TASK_TYPES.CODING, prompt: `Generate responsive website code for: ${request.goal}`, dependsOn: ["design"] }),
        this.aiStep({ id: "seo", title: "Generate SEO and content metadata", taskType: AI_TASK_TYPES.DOCUMENT, prompt: `Create SEO metadata, page copy, and structured content for: ${request.goal}`, dependsOn: ["strategy"] }),
      ],
    });
  }
}
