export const TOOL_RISK_LEVELS = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

export const TOOL_EXECUTION_MODES = Object.freeze({
  SYNC: "sync",
  QUEUE: "queue",
  STREAM: "stream",
});

export const TOOL_CAPABILITIES = Object.freeze({
  FILE_READ: "file_read",
  FILE_WRITE: "file_write",
  NETWORK: "network",
  SHELL: "shell",
  PROVIDER_CALL: "provider_call",
  ASSET_RENDER: "asset_render",
  DEPLOYMENT: "deployment",
  PAYMENT: "payment",
  EMAIL_SEND: "email_send",
});

export const TOOL_EXECUTION_STATUSES = Object.freeze({
  ACCEPTED: "accepted",
  WAITING_FOR_APPROVAL: "waiting_for_approval",
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
});
