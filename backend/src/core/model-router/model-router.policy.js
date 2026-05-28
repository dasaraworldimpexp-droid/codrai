import { AI_CAPABILITIES, AI_TASK_TYPES } from "../../contracts/ai-task.contract.js";

export const MODEL_ROUTING_POLICIES = Object.freeze({
  [AI_TASK_TYPES.CODING]: {
    requiredCapabilities: [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.TOOL_USE, AI_CAPABILITIES.STRUCTURED_OUTPUT],
    executionMode: "sync_or_queue",
    preferredProviderTypes: ["llm"],
  },
  [AI_TASK_TYPES.IMAGE]: {
    requiredCapabilities: [AI_CAPABILITIES.IMAGE_GENERATION],
    executionMode: "queue",
    preferredProviderTypes: ["image"],
  },
  [AI_TASK_TYPES.VIDEO]: {
    requiredCapabilities: [AI_CAPABILITIES.VIDEO_GENERATION],
    executionMode: "queue",
    preferredProviderTypes: ["video"],
  },
  [AI_TASK_TYPES.VOICE]: {
    requiredCapabilities: [AI_CAPABILITIES.VOICE_SYNTHESIS],
    executionMode: "queue",
    preferredProviderTypes: ["voice"],
  },
  [AI_TASK_TYPES.REASONING]: {
    requiredCapabilities: [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.REASONING],
    executionMode: "sync_or_queue",
    preferredProviderTypes: ["llm"],
  },
  [AI_TASK_TYPES.RESEARCH]: {
    requiredCapabilities: [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.TOOL_USE, AI_CAPABILITIES.LONG_CONTEXT],
    executionMode: "queue",
    preferredProviderTypes: ["llm"],
  },
  [AI_TASK_TYPES.DOCUMENT]: {
    requiredCapabilities: [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.STRUCTURED_OUTPUT],
    executionMode: "sync_or_queue",
    preferredProviderTypes: ["llm"],
  },
  [AI_TASK_TYPES.PRESENTATION]: {
    requiredCapabilities: [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.STRUCTURED_OUTPUT],
    executionMode: "queue",
    preferredProviderTypes: ["llm", "image"],
  },
  [AI_TASK_TYPES.ECOMMERCE]: {
    requiredCapabilities: [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.TOOL_USE, AI_CAPABILITIES.STRUCTURED_OUTPUT],
    executionMode: "queue",
    preferredProviderTypes: ["llm"],
  },
  [AI_TASK_TYPES.GAME]: {
    requiredCapabilities: [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.TOOL_USE, AI_CAPABILITIES.STRUCTURED_OUTPUT],
    executionMode: "queue",
    preferredProviderTypes: ["llm", "image"],
  },
  [AI_TASK_TYPES.EDUCATION]: {
    requiredCapabilities: [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.LONG_CONTEXT],
    executionMode: "sync_or_queue",
    preferredProviderTypes: ["llm"],
  },
  [AI_TASK_TYPES.AUTOMATION]: {
    requiredCapabilities: [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.TOOL_USE, AI_CAPABILITIES.STRUCTURED_OUTPUT],
    executionMode: "queue",
    preferredProviderTypes: ["llm"],
  },
});
