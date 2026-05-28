import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class BusinessAutomationEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.AUTOMATION,
      projectType: "business_automation",
      name: "Business Automation Engine",
      description: "Creates CRM workflows, email systems, sales funnels, social automations, analytics, and operations flows.",
      artifacts: [CREATION_ARTIFACT_TYPES.WORKFLOW, CREATION_ARTIFACT_TYPES.API_SPEC],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "process-map", title: "Map business process", agentType: AGENT_TYPES.BUSINESS, objective: request.goal }),
        this.agentStep({ id: "automation-plan", title: "Design automation workflow", agentType: AGENT_TYPES.AUTOMATION, objective: request.goal, dependsOn: ["process-map"] }),
        this.aiStep({ id: "integration-spec", title: "Generate integration specification", taskType: AI_TASK_TYPES.AUTOMATION, prompt: `Create integration spec, triggers, actions, and failure handling for: ${request.goal}`, dependsOn: ["automation-plan"] }),
      ],
    });
  }
}
