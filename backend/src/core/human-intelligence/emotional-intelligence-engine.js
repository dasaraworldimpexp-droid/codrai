export class EmotionalIntelligenceEngine {
  constructor({ personalizationService, emotionalMemoryRepository } = {}) {
    this.personalizationService = personalizationService;
    this.emotionalMemoryRepository = emotionalMemoryRepository;
  }

  async analyze({ text, userId, workspaceId, conversationId }) {
    const profile = await this.personalizationService?.getRuntimeProfile?.(userId, workspaceId);
    const priorContext = await this.emotionalMemoryRepository?.getRecentSignals?.({ userId, workspaceId, conversationId });
    const tone = this.#detectTone(text);
    const urgency = this.#detectUrgency(text);
    const confidenceNeed = this.#detectConfidenceNeed(text);

    return {
      tone,
      urgency,
      confidenceNeed,
      responseStyle: this.#responseStyle({ tone, urgency, profile }),
      pacing: urgency === "high" ? "direct" : "measured",
      empathyLevel: ["frustrated", "overwhelmed", "uncertain"].includes(tone) ? "high" : "balanced",
      priorContext,
      persistable: tone !== "neutral" || urgency === "high",
    };
  }

  adaptPrompt({ basePrompt, emotionalContext }) {
    return [
      basePrompt,
      "Adapt communication using these interaction signals:",
      `tone=${emotionalContext.tone}`,
      `urgency=${emotionalContext.urgency}`,
      `responseStyle=${emotionalContext.responseStyle}`,
      `empathyLevel=${emotionalContext.empathyLevel}`,
      "Be natural, trustworthy, and professionally useful. Do not overstate emotion detection.",
    ].join("\n");
  }

  #detectTone(text = "") {
    const normalized = text.toLowerCase();
    if (/(stuck|confused|don't understand|do not understand|lost)/.test(normalized)) return "uncertain";
    if (/(angry|frustrated|annoyed|broken|not working)/.test(normalized)) return "frustrated";
    if (/(urgent|asap|quickly|right now|deadline)/.test(normalized)) return "urgent";
    if (/(excited|great|amazing|love)/.test(normalized)) return "positive";
    if (/(too much|overwhelmed|stress|worried)/.test(normalized)) return "overwhelmed";
    return "neutral";
  }

  #detectUrgency(text = "") {
    return /(urgent|asap|right now|deadline|immediately|production down)/i.test(text) ? "high" : "normal";
  }

  #detectConfidenceNeed(text = "") {
    return /(explain|teach|why|how|step by step|beginner)/i.test(text) ? "teaching" : "execution";
  }

  #responseStyle({ tone, urgency, profile }) {
    if (urgency === "high") return "concise_action_first";
    if (tone === "uncertain") return "mentor_explanation";
    return profile?.responseStyle || "professional_collaborative";
  }
}
