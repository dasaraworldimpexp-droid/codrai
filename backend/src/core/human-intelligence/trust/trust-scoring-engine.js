export class TrustScoringEngine {
  scoreInteraction({ truthResult, providerResult, userFeedback, policyFlags = [] }) {
    const base = 0.72;
    const sourceBoost = truthResult?.verifiedSources?.length ? 0.14 : 0;
    const confidenceBoost = Math.min(providerResult?.confidence || 0, 1) * 0.08;
    const feedbackBoost = userFeedback?.score ? (userFeedback.score - 0.5) * 0.12 : 0;
    const policyPenalty = policyFlags.length * 0.08;

    const score = Math.max(0, Math.min(1, base + sourceBoost + confidenceBoost + feedbackBoost - policyPenalty));

    return {
      score,
      level: score > 0.85 ? "high" : score > 0.6 ? "medium" : "needs_review",
      policyFlags,
      computedAt: new Date().toISOString(),
    };
  }
}
