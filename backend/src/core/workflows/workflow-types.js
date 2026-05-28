export const WORKFLOW_STEP_TYPES = Object.freeze({
  AI_TASK: "ai_task",
  AGENT_TASK: "agent_task",
  HUMAN_APPROVAL: "human_approval",
  ASSET_TRANSFORM: "asset_transform",
  EXPORT: "export",
  INTEGRATION_CALL: "integration_call",
  NOTIFICATION: "notification",
  TOOL: "tool",
  MEMORY: "memory",
  CONDITION: "condition",
  LOOP: "loop",
  DEPLOYMENT: "deployment",
});

export const WORKFLOW_RUN_STATUSES = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  WAITING_FOR_APPROVAL: "waiting_for_approval",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

export const WORKFLOW_STEP_STATUSES = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  WAITING_FOR_APPROVAL: "waiting_for_approval",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
});
