export class HumanContextRouter {
  constructor({ emotionalStateEngine, personalityEngine, relationshipMemoryService }) {
    this.emotionalStateEngine = emotionalStateEngine;
    this.personalityEngine = personalityEngine;
    this.relationshipMemoryService = relationshipMemoryService;
  }

  async route({ userId, workspaceId, conversationId, text }) {
    const relationshipTimeline = await this.relationshipMemoryService.timeline({ userId, workspaceId, limit: 12 });
    const emotionalState = this.emotionalStateEngine.analyze({ text, recentSignals: relationshipTimeline });
    const personalityProfile = await this.personalityEngine.resolveProfile({ userId, workspaceId, emotionalState });

    return {
      emotionalState,
      personalityProfile,
      relationshipTimeline,
      adaptiveInstruction: this.personalityEngine.adaptInstruction({ profile: personalityProfile, emotionalState }),
    };
  }
}
