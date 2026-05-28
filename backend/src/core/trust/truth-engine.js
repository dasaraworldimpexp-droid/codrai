export class TruthEngine {
  constructor({ sourceVerifier, moderationService }) {
    this.sourceVerifier = sourceVerifier;
    this.moderationService = moderationService;
  }

  async verify({ claim, sources = [], workspaceId }) {
    const moderation = await this.moderationService?.check?.({ text: claim, workspaceId });
    const verifiedSources = [];
    const rejectedSources = [];

    for (const source of sources) {
      const result = await this.sourceVerifier?.verify?.(source);
      if (result?.verified) verifiedSources.push({ source, result });
      else rejectedSources.push({ source, result });
    }

    const confidence = sources.length === 0 ? 0.45 : verifiedSources.length / sources.length;

    return {
      confidence,
      reliability: confidence > 0.8 ? "high" : confidence > 0.55 ? "medium" : "low",
      verifiedSources,
      rejectedSources,
      moderation,
      requiresCaveat: confidence < 0.7,
      verifiedAt: new Date().toISOString(),
    };
  }
}
