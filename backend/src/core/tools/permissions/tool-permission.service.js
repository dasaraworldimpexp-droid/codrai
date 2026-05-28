import { TOOL_RISK_LEVELS } from "../tool-types.js";

const RISK_ORDER = {
  [TOOL_RISK_LEVELS.LOW]: 1,
  [TOOL_RISK_LEVELS.MEDIUM]: 2,
  [TOOL_RISK_LEVELS.HIGH]: 3,
};

export class ToolPermissionService {
  constructor({ approvalRepository, auditLogger } = {}) {
    this.approvalRepository = approvalRepository;
    this.auditLogger = auditLogger;
  }

  async authorize({ tool, request, actor }) {
    const deniedCapability = (tool.manifest.capabilities || []).find(
      (capability) => request.deniedCapabilities?.includes(capability)
    );

    if (deniedCapability) {
      throw new Error(`Tool capability is denied by policy: ${deniedCapability}`);
    }

    const risk = request.riskLevel || tool.manifest.riskLevel || TOOL_RISK_LEVELS.LOW;
    const maxAutonomousRisk = request.maxAutonomousRisk || TOOL_RISK_LEVELS.MEDIUM;

    if (RISK_ORDER[risk] > RISK_ORDER[maxAutonomousRisk]) {
      const approval = await this.approvalRepository?.create?.({
        workspaceId: request.workspaceId,
        projectId: request.projectId,
        toolName: tool.manifest.name,
        actor,
        input: request.input,
        risk,
        status: "pending",
      });

      await this.auditLogger?.record?.({
        workspaceId: request.workspaceId,
        actorId: actor?.id,
        action: "tool.approval_required",
        metadata: { toolName: tool.manifest.name, approvalId: approval?.id, risk },
      });

      return { allowed: false, requiresApproval: true, approval };
    }

    return { allowed: true, requiresApproval: false };
  }
}
