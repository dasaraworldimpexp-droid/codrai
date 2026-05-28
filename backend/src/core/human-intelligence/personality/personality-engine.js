export class PersonalityEngine {
  constructor({ profileRepository } = {}) {
    this.profileRepository = profileRepository;
  }

  async resolveProfile({ userId, workspaceId, emotionalState }) {
    const stored = await this.profileRepository?.get?.({ userId, workspaceId });

    return {
      userId,
      workspaceId,
      preferredTone: stored?.preferredTone || "professional_warm",
      detailLevel: stored?.detailLevel || "balanced",
      learningStyle: stored?.learningStyle || "practical",
      collaborationStyle: emotionalState.urgency === "high" ? "action_first" : stored?.collaborationStyle || "mentor_operator",
      trustMode: emotionalState.confidenceNeed === "high" ? "explain_with_evidence" : stored?.trustMode || "clear_and_direct",
      updatedAt: new Date().toISOString(),
    };
  }

  adaptInstruction({ profile, emotionalState }) {
    return [
      `tone=${profile.preferredTone}`,
      `detail=${profile.detailLevel}`,
      `learning_style=${profile.learningStyle}`,
      `collaboration=${profile.collaborationStyle}`,
      `trust_mode=${profile.trustMode}`,
      `mood=${emotionalState.mood}`,
      `urgency=${emotionalState.urgency}`,
      "Respond naturally, professionally, and without pretending certainty.",
    ].join("\n");
  }
}
