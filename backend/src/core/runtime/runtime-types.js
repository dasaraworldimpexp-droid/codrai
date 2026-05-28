export const RUNTIME_EXECUTION_MODES = Object.freeze({
  SYNC: "sync",
  STREAM: "stream",
  QUEUE: "queue",
});

export const RUNTIME_STATUSES = Object.freeze({
  ACCEPTED: "accepted",
  CONTEXT_BUILDING: "context_building",
  ROUTING: "routing",
  QUEUED: "queued",
  STREAMING: "streaming",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

export const RUNTIME_TASK_KINDS = Object.freeze({
  CHAT: "chatbot_ai",
  CODING: "coding_ai",
  IMAGE: "image_ai",
  VIDEO: "video_ai",
  VOICE: "voice_ai",
  AUTOMATION: "automation_ai",
  TEACHER: "teacher_ai",
});
