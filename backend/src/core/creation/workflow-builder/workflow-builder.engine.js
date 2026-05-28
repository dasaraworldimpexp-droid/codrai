import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class WorkflowBuilderEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.WORKFLOW,
      projectType: "workflow",
      name: "Workflow Builder",
      description: "Creates chained, dependency-aware, approval-gated workflows for AI and business operations.",
      artifacts: [CREATION_ARTIFACT_TYPES.WORKFLOW],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "workflow-plan", title: "Plan workflow graph", agentType: AGENT_TYPES.AUTOMATION, objective: request.goal }),
        this.aiStep({ id: "workflow-definition", title: "Generate executable workflow definition", taskType: AI_TASK_TYPES.AUTOMATION, prompt: `Create dependency graph, step contracts, retry policy, and approvals for workflow: ${request.goal}`, dependsOn: ["workflow-plan"] }),
      ],
    });
  }
}
