export const CREATION_PROVIDER_ROUTES = Object.freeze({
  coding: {
    primary: ["openai", "anthropic", "deepseek"],
    fallback: ["gemini", "groq"],
    requiredCapabilities: ["text", "tool_use", "structured_output"],
  },
  reasoning: {
    primary: ["anthropic", "openai", "gemini"],
    fallback: ["deepseek"],
    requiredCapabilities: ["text", "reasoning", "long_context"],
  },
  image: {
    primary: ["fal", "stability_ai", "replicate"],
    fallback: ["openai"],
    requiredCapabilities: ["image_generation", "image_editing", "upscaling"],
  },
  video: {
    primary: ["runway", "fal", "replicate"],
    fallback: [],
    requiredCapabilities: ["video_generation", "image_to_video", "text_to_video"],
  },
  voice: {
    primary: ["elevenlabs", "openai"],
    fallback: [],
    requiredCapabilities: ["voice_synthesis", "voice_cloning", "speech_to_text"],
  },
  documents: {
    primary: ["openai", "anthropic", "gemini"],
    fallback: ["deepseek"],
    requiredCapabilities: ["text", "structured_output", "long_context"],
  },
  automation: {
    primary: ["openai", "anthropic"],
    fallback: ["gemini", "deepseek"],
    requiredCapabilities: ["text", "tool_use", "structured_output"],
  },
});

export class CreationProviderRoutingCatalog {
  getRoute(workloadType) {
    const route = CREATION_PROVIDER_ROUTES[workloadType];

    if (!route) {
      throw new Error(`No creation provider route configured for workload: ${workloadType}`);
    }

    return route;
  }

  listRoutes() {
    return CREATION_PROVIDER_ROUTES;
  }
}
