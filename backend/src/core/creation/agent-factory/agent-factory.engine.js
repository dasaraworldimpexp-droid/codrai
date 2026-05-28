import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class AgentFactoryEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.AGENT_FACTORY,
      projectType: "ai_agent",
      name: "AI Agent Factory",
      description: "Creates custom agents with personality, tools, permissions, memory scopes, workflows, and teams.",
      artifacts: [CREATION_ARTIFACT_TYPES.AGENT, CREATION_ARTIFACT_TYPES.WORKFLOW],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "agent-spec", title: "Design custom agent specification", agentType: AGENT_TYPES.ARCHITECT, objective: request.goal }),
        this.aiStep({ id: "policy", title: "Generate permissions and memory policy", taskType: AI_TASK_TYPES.REASONING, prompt: `Define tools, permissions, memory scopes, safety rules, and collaboration policy for agent: ${request.goal}`, dependsOn: ["agent-spec"] }),
        this.aiStep({ id: "workflow", title: "Generate agent workflows", taskType: AI_TASK_TYPES.AUTOMATION, prompt: `Create workflows and triggers for custom agent: ${request.goal}`, dependsOn: ["policy"] }),
      ],
    });
  }
}
