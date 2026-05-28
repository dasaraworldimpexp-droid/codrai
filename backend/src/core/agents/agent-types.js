export const AGENT_TYPES = Object.freeze({
  ARCHITECT: "architect_agent",
  CODING: "coding_agent",
  BUSINESS: "business_agent",
  MARKETING: "marketing_agent",
  DESIGN: "design_agent",
  VIDEO: "video_agent",
  AUTOMATION: "automation_agent",
  RESEARCH: "research_agent",
  TEACHER: "teacher_agent",
  VOICE: "voice_agent",
  CUSTOMER_SUPPORT: "customer_support_agent",
});

export const AGENT_RUN_STATUSES = Object.freeze({
  QUEUED: "queued",
  PLANNING: "planning",
  RUNNING: "running",
  WAITING_FOR_APPROVAL: "waiting_for_approval",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

export const AGENT_MESSAGE_TYPES = Object.freeze({
  QUESTION: "question",
  ANSWER: "answer",
  DELEGATION: "delegation",
  STATUS: "status",
  REVIEW: "review",
  APPROVAL_REQUEST: "approval_request",
  MEMORY_NOTE: "memory_note",
  HANDOFF: "handoff",
});

export const AGENT_RISK_LEVELS = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});
