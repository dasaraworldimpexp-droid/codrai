import { AI_TASK_TYPES } from "../../../contracts/ai-task.contract.js";
import { AGENT_TYPES } from "../../agents/agent-types.js";
import { BaseCreationEngine } from "../base-creation-engine.js";
import { CREATION_ARTIFACT_TYPES, CREATION_ENGINE_TYPES } from "../creation-types.js";

export class VoiceAudioEngine extends BaseCreationEngine {
  constructor() {
    super({
      type: CREATION_ENGINE_TYPES.VOICE,
      projectType: "voice_audio",
      name: "Voice Audio Engine",
      description: "Creates multilingual, emotional, studio-quality voiceover and voice cloning workflows.",
      artifacts: [CREATION_ARTIFACT_TYPES.MEDIA_ASSET, CREATION_ARTIFACT_TYPES.DOCUMENT],
    });
  }

  createWorkflow(request) {
    return this.workflow({
      request,
      steps: [
        this.agentStep({ id: "voice-direction", title: "Define voice direction", agentType: AGENT_TYPES.VOICE, objective: request.goal }),
        this.aiStep({ id: "script", title: "Prepare voice script", taskType: AI_TASK_TYPES.DOCUMENT, prompt: `Prepare voiceover script and emotional direction for: ${request.goal}`, dependsOn: ["voice-direction"] }),
        this.aiStep({ id: "render-audio", title: "Render voice audio", taskType: AI_TASK_TYPES.VOICE, prompt: request.goal, dependsOn: ["script"], background: true }),
      ],
    });
  }
}
