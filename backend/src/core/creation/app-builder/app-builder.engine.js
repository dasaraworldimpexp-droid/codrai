import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class AppBuilderEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.APP,
      projectType: "full_stack_app",
      name: "App Builder",
      description: "Generates full-stack app architecture, frontend, backend, database, auth, APIs, and deployment plan.",
      artifacts: [
        CREATION_ARTIFACT_TYPES.API_SPEC,
        CREATION_ARTIFACT_TYPES.DATABASE_SCHEMA,
        CREATION_ARTIFACT_TYPES.SOURCE_CODE,
        CREATION_ARTIFACT_TYPES.DEPLOYMENT_PLAN,
      ],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "architecture", title: "Design app architecture", agentType: AGENT_TYPES.ARCHITECT, objective: request.goal }),
        this.aiStep({ id: "database", title: "Generate database schema", taskType: AI_TASK_TYPES.CODING, prompt: `Design production database schema for: ${request.goal}`, dependsOn: ["architecture"] }),
        this.aiStep({ id: "backend", title: "Generate backend API", taskType: AI_TASK_TYPES.CODING, prompt: `Generate backend API, auth, services, routes, and validation for: ${request.goal}`, dependsOn: ["database"] }),
        this.aiStep({ id: "frontend", title: "Generate responsive frontend", taskType: AI_TASK_TYPES.CODING, prompt: `Generate responsive frontend screens and state flows for: ${request.goal}`, dependsOn: ["architecture"] }),
        this.agentStep({ id: "qa", title: "Review app for production readiness", agentType: AGENT_TYPES.CODING, objective: `Review generated app plan and code for ${request.goal}`, dependsOn: ["backend", "frontend"] }),
      ],
    });
  }
}
