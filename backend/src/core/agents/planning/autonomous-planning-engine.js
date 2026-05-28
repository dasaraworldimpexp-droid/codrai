import { randomUUID } from "node:crypto";
import { AGENT_RISK_LEVELS, AGENT_TYPES } from "../agent-types.js";

export class AutonomousPlanningEngine {
  constructor({ aiRuntimeEngine, agentProfileRegistry, riskClassifier }) {
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.agentProfileRegistry = agentProfileRegistry;
    this.riskClassifier = riskClassifier;
  }

  async createPlan({ run, objective, memoryContext, emotionalContext }) {
    const riskLevel = await this.riskClassifier.classify({ objective, memoryContext });
    const requiredAgents = this.#selectAgents(objective);

    const planningResult = await this.aiRuntimeEngine.execute({
      userId: run.userId,
      workspaceId: run.workspaceId,
      projectId: run.projectId,
      taskType: "reasoning",
      intent: "Create an autonomous multi-agent execution plan.",
      input: {
        text: JSON.stringify({
          objective,
          riskLevel,
          requiredAgents,
          memoryContext,
          emotionalContext,
          outputContract: "Return milestones, tasks, dependencies, approval gates, and success criteria.",
        }),
      },
      qualityTier: "premium",
      metadata: { subsystem: "autonomous_planning", agentRunId: run.id },
    });

    return this.#normalizePlan({
      objective,
      riskLevel,
      requiredAgents,
      planningResult,
    });
  }

  #normalizePlan({ objective, riskLevel, requiredAgents, planningResult }) {
    const rawTasks = planningResult?.result?.tasks || planningResult?.tasks || [];
    const tasks = rawTasks.length > 0 ? rawTasks : requiredAgents.map((agentType, index) => ({
      id: randomUUID(),
      agentType,
      title: `${agentType.replace("_agent", "").replace("_", " ")} contribution`,
      objective,
      dependsOn: index === 0 ? [] : [],
      riskLevel,
      background: false,
    }));

    return {
      id: randomUUID(),
      objective,
      assumptions: planningResult?.result?.assumptions || [],
      riskLevel,
      milestones: planningResult?.result?.milestones || [],
      tasks,
      dependencies: tasks.flatMap((task) => (task.dependsOn || []).map((dependency) => ({ from: dependency, to: task.id }))),
      requiredAgents,
      approvalGates: tasks.filter((task) => task.riskLevel === AGENT_RISK_LEVELS.HIGH).map((task) => ({
        taskId: task.id,
        reason: "High-risk autonomous action requires human approval.",
      })),
      successCriteria: planningResult?.result?.successCriteria || ["Objective is completed and specialist outputs are synthesized."],
      retryPolicy: { maxAttempts: 2, retryOn: ["provider_timeout", "transient_failure"] },
    };
  }

  #selectAgents(objective) {
    const text = String(objective || "").toLowerCase();
    const selected = new Set([AGENT_TYPES.ARCHITECT]);

    if (/(code|app|website|software|bug|api|database)/.test(text)) selected.add(AGENT_TYPES.CODING);
    if (/(business|revenue|pricing|startup|operations)/.test(text)) selected.add(AGENT_TYPES.BUSINESS);
    if (/(market|launch|campaign|copy|sales|brand)/.test(text)) selected.add(AGENT_TYPES.MARKETING);
    if (/(design|ui|ux|brand|interface)/.test(text)) selected.add(AGENT_TYPES.DESIGN);
    if (/(video|storyboard|cinematic|reel)/.test(text)) selected.add(AGENT_TYPES.VIDEO);
    if (/(automation|workflow|integrate|crm|zapier)/.test(text)) selected.add(AGENT_TYPES.AUTOMATION);
    if (/(research|compare|source|analyze)/.test(text)) selected.add(AGENT_TYPES.RESEARCH);
    if (/(teach|learn|course|lesson|education)/.test(text)) selected.add(AGENT_TYPES.TEACHER);
    if (/(voice|speech|audio|multilingual)/.test(text)) selected.add(AGENT_TYPES.VOICE);
    if (/(support|customer|ticket|helpdesk)/.test(text)) selected.add(AGENT_TYPES.CUSTOMER_SUPPORT);

    return [...selected];
  }
}
