import { AGENT_RISK_LEVELS } from "../agent-types.js";

const RISK_ORDER = {
  [AGENT_RISK_LEVELS.LOW]: 1,
  [AGENT_RISK_LEVELS.MEDIUM]: 2,
  [AGENT_RISK_LEVELS.HIGH]: 3,
};

export class AgentPermissionService {
  constructor({ approvalRepository, auditLogger } = {}) {
    this.approvalRepository = approvalRepository;
    this.auditLogger = auditLogger;
  }

  async assertCanExecute({ agentProfile, task, run }) {
    const missingTools = (task.requiredTools || []).filter((tool) => !agentProfile.allowedTools.includes(tool));

    if (missingTools.length > 0) {
      throw new Error(`${agentProfile.displayName} is not allowed to use tools: ${missingTools.join(", ")}`);
    }

    const taskRisk = task.riskLevel || AGENT_RISK_LEVELS.LOW;

    if (RISK_ORDER[taskRisk] > RISK_ORDER[agentProfile.maxAutonomyRisk]) {
      const approval = await this.approvalRepository?.create?.({
        workspaceId: run.workspaceId,
        projectId: run.projectId,
        agentRunId: run.id,
        agentType: agentProfile.type,
        task,
        reason: `Task risk '${taskRisk}' exceeds autonomous limit '${agentProfile.maxAutonomyRisk}'.`,
        status: "pending",
      });

      await this.auditLogger?.record?.({
        workspaceId: run.workspaceId,
        actorId: run.userId,
        action: "agent.approval_required",
        metadata: { agentType: agentProfile.type, taskId: task.id, approvalId: approval?.id },
      });

      return { requiresApproval: true, approval };
    }

    return { requiresApproval: false };
  }

  filterMemoryScopes(agentProfile, requestedScopes = []) {
    if (requestedScopes.length === 0) {
      return agentProfile.memoryScopes;
    }

    return requestedScopes.filter((scope) => agentProfile.memoryScopes.includes(scope));
  }
}
