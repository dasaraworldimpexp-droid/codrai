import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class ChatbotBuilderEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.CHATBOT,
      projectType: "chatbot",
      name: "Chatbot Builder",
      description: "Creates memory-aware support, sales, education, and workflow chatbots with tools and policies.",
      artifacts: [CREATION_ARTIFACT_TYPES.AGENT, CREATION_ARTIFACT_TYPES.WORKFLOW, CREATION_ARTIFACT_TYPES.API_SPEC],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "bot-purpose", title: "Define chatbot purpose and policy", agentType: AGENT_TYPES.CUSTOMER_SUPPORT, objective: request.goal }),
        this.aiStep({ id: "conversation-design", title: "Generate conversation architecture", taskType: AI_TASK_TYPES.REASONING, prompt: `Design intents, memory rules, tool calls, escalation, and tone for chatbot: ${request.goal}`, dependsOn: ["bot-purpose"] }),
        this.aiStep({ id: "api-contract", title: "Generate chatbot API contract", taskType: AI_TASK_TYPES.CODING, prompt: `Create chatbot API, embedding, memory, and integration contract for: ${request.goal}`, dependsOn: ["conversation-design"] }),
      ],
    });
  }
}
