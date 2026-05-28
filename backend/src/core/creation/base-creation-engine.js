import { randomUUID } from "node:crypto";
import { WORKFLOW_STEP_TYPES } from "../workflows/workflow-types.js";

export class BaseCreationEngine {
  constructor({ type, projectType, name, description, artifacts }) {
    this.type = type;
    this.projectType = projectType;
    this.name = name;
    this.description = description;
    this.artifacts = artifacts;
  }

  manifest() {
    return {
      type: this.type,
      projectType: this.projectType,
      name: this.name,
      description: this.description,
      artifacts: this.artifacts,
    };
  }

  defaultProjectName(request) {
    return request.goal?.slice(0, 80) || this.name;
  }

  workflow({ request, steps }) {
    return {
      id: request.runId || randomUUID(),
      type: this.type,
      name: `${this.name} workflow`,
      goal: request.goal,
      projectId: request.project.id,
      workspaceId: request.workspaceId,
      steps,
      successCriteria: [
        "Workflow produces declared artifacts.",
        "All generated assets are attached to the project.",
        "Execution journal records agent/tool/provider decisions.",
      ],
    };
  }

  aiStep({ id, title, taskType, prompt, dependsOn = [], background = false, metadata = {} }) {
    return {
      id,
      title,
      type: WORKFLOW_STEP_TYPES.AI_TASK,
      dependsOn,
      background,
      task: {
        taskType,
        intent: title,
        input: { text: prompt },
        metadata,
      },
      options: background ? { executionMode: "queue" } : undefined,
    };
  }

  agentStep({ id, title, agentType, objective, dependsOn = [], background = false, metadata = {} }) {
    return {
      id,
      title,
      type: WORKFLOW_STEP_TYPES.AGENT_TASK,
      dependsOn,
      background,
      agentRun: {
        leadAgentType: agentType,
        objective,
        metadata,
      },
    };
  }
}
