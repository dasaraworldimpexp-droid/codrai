import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class EcommerceBuilderEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.ECOMMERCE,
      projectType: "ecommerce",
      name: "Ecommerce Builder",
      description: "Creates storefronts, products, checkout flows, inventory systems, marketing funnels, and analytics plans.",
      artifacts: [CREATION_ARTIFACT_TYPES.SOURCE_CODE, CREATION_ARTIFACT_TYPES.DATABASE_SCHEMA, CREATION_ARTIFACT_TYPES.WORKFLOW],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "commerce-strategy", title: "Design ecommerce strategy", agentType: AGENT_TYPES.BUSINESS, objective: request.goal }),
        this.aiStep({ id: "catalog-schema", title: "Generate product and order schema", taskType: AI_TASK_TYPES.ECOMMERCE, prompt: `Create product, cart, order, payment, and inventory schema for: ${request.goal}`, dependsOn: ["commerce-strategy"] }),
        this.aiStep({ id: "storefront", title: "Generate storefront experience", taskType: AI_TASK_TYPES.CODING, prompt: `Generate storefront UI/API plan for: ${request.goal}`, dependsOn: ["catalog-schema"] }),
        this.agentStep({ id: "campaign", title: "Create ecommerce launch funnel", agentType: AGENT_TYPES.MARKETING, objective: request.goal, dependsOn: ["commerce-strategy"] }),
      ],
    });
  }
}
