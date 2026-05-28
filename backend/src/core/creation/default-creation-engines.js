import { AgentFactoryEngine } from "./agent-factory/agent-factory.engine.js";
import { AppBuilderEngine } from "./app-builder/app-builder.engine.js";
import { BusinessAutomationEngine } from "./automation-engine/business-automation.engine.js";
import { ChatbotBuilderEngine } from "./chatbot-builder/chatbot-builder.engine.js";
import { CreationEngineRegistry } from "./creation-engine-registry.js";
import { DocumentEngine } from "./document-engine/document.engine.js";
import { EcommerceBuilderEngine } from "./ecommerce-builder/ecommerce-builder.engine.js";
import { GameBuilderEngine } from "./game-builder/game-builder.engine.js";
import { ImageGenerationEngine } from "./image-engine/image-generation.engine.js";
import { PresentationEngine } from "./presentation-engine/presentation.engine.js";
import { VideoGenerationEngine } from "./video-engine/video-generation.engine.js";
import { VoiceAudioEngine } from "./voice-engine/voice-audio.engine.js";
import { WebsiteBuilderEngine } from "./website-builder/website-builder.engine.js";
import { WorkflowBuilderEngine } from "./workflow-builder/workflow-builder.engine.js";

export function createDefaultCreationEngineRegistry() {
  const registry = new CreationEngineRegistry();

  [
    new AppBuilderEngine(),
    new WebsiteBuilderEngine(),
    new GameBuilderEngine(),
    new ImageGenerationEngine(),
    new VideoGenerationEngine(),
    new VoiceAudioEngine(),
    new DocumentEngine(),
    new PresentationEngine(),
    new BusinessAutomationEngine(),
    new AgentFactoryEngine(),
    new WorkflowBuilderEngine(),
    new EcommerceBuilderEngine(),
    new ChatbotBuilderEngine(),
  ].forEach((engine) => registry.register(engine));

  return registry;
}
