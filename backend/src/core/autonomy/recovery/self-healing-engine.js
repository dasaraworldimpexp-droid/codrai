export class SelfHealingEngine {
  createRecoveryPlan({ failedStep, error, run }) {
    const retryable = error.retryable === true || /timeout|rate|temporar|network|overloaded/i.test(error.message || "");

    return {
      runId: run.id,
      failedStepId: failedStep.id,
      retryable,
      strategy: retryable ? "retry_with_backoff_or_fallback_provider" : "request_human_review",
      actions: retryable
        ? ["increase_timeout", "switch_provider_if_available", "compress_context", "retry_step"]
        : ["summarize_failure", "request_approval", "preserve_partial_outputs"],
      createdAt: new Date().toISOString(),
    };
  }
}
