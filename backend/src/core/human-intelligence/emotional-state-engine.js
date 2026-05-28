export class EmotionalStateEngine {
  analyze({ text = "", recentSignals = [] }) {
    const normalized = text.toLowerCase();
    const signals = {
      frustration: /(broken|not working|again|frustrated|angry|annoyed|useless)/.test(normalized),
      confusion: /(confused|lost|don't understand|do not understand|what does|how do i)/.test(normalized),
      urgency: /(urgent|asap|deadline|right now|production|immediately)/.test(normalized),
      trustConcern: /(safe|trust|secure|privacy|wrong|hallucinat|source|verify)/.test(normalized),
      positive: /(great|love|perfect|nice|excited|awesome)/.test(normalized),
    };

    const mood = signals.frustration ? "frustrated"
      : signals.confusion ? "confused"
      : signals.urgency ? "urgent"
      : signals.positive ? "positive"
      : "neutral";

    return {
      mood,
      urgency: signals.urgency ? "high" : "normal",
      confidenceNeed: signals.confusion || signals.trustConcern ? "high" : "normal",
      empathyNeed: signals.frustration || signals.confusion ? "high" : "balanced",
      signals,
      continuitySignals: recentSignals.slice(-5),
      analyzedAt: new Date().toISOString(),
    };
  }
}
