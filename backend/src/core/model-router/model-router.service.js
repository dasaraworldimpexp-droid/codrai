import { MODEL_ROUTING_POLICIES } from "./model-router.policy.js";

export class ModelRouterService {
  constructor({ providerRegistry, providerHealthService, usageEstimator }) {
    this.providerRegistry = providerRegistry;
    this.providerHealthService = providerHealthService;
    this.usageEstimator = usageEstimator;
  }

  async route(task) {
    const policy = MODEL_ROUTING_POLICIES[task.taskType];

    if (!policy) {
      throw new Error(`Unsupported AI task type: ${task.taskType}`);
    }

    const candidates = await this.providerRegistry.findProviders({
      capabilities: [...policy.requiredCapabilities, ...(task.requiredCapabilities || [])],
      providerTypes: policy.preferredProviderTypes,
      qualityTier: task.qualityTier,
    });

    const healthyCandidates = await this.providerHealthService.filterHealthy(candidates, task);

    if (healthyCandidates.length === 0) {
      throw new Error(`No healthy provider available for task type: ${task.taskType}`);
    }

    this.#applyLocalModelHint(task);
    const preferredCandidates = this.#rankForProviderPreference(task, healthyCandidates);
    const healthRankedCandidates = this.#rankForLowResource(task, this.providerHealthService.rankProviders?.(preferredCandidates) || preferredCandidates);
    const rankedCandidates = await this.usageEstimator.rankByCostLatency({
      candidates: healthRankedCandidates,
      task,
      maxCost: task.maxCost,
      latencyTargetMs: task.latencyTargetMs,
    });

    return {
      provider: rankedCandidates[0],
      fallbackProviders: rankedCandidates.slice(1),
      executionMode: policy.executionMode,
      policy,
    };
  }

  #applyLocalModelHint(task) {
    if (task.model || process.env.CODRAI_LOCAL_ROUTING !== "true") return;
    const text = `${task.intent || ""}\n${task.input?.text || ""}`.toLowerCase();
    const length = text.length;
    const heavyCoding = /(refactor|architecture|debug|fix|repository|multi-file|typescript|react|postgres|docker)/i.test(text);
    const simple = length < 450 && !/(reason|plan|analyze|research|code|debug|architect)/i.test(text);

    if (simple) {
      task.model = process.env.CODRAI_TINY_MODEL || "tinyllama";
      task.latencyTargetMs = task.latencyTargetMs || 1200;
      return;
    }
    if (task.taskType === "coding" && heavyCoding) {
      task.model = process.env.CODRAI_HEAVY_CODING_MODEL || "qwen2.5-coder";
      task.latencyTargetMs = task.latencyTargetMs || 15000;
      return;
    }
    if (task.taskType === "coding") {
      task.model = process.env.CODRAI_CODING_MODEL || "deepseek-coder";
      task.latencyTargetMs = task.latencyTargetMs || 7000;
      return;
    }
    if (task.qualityTier === "premium" || /(strategy|deep reasoning|complex|long horizon|analysis)/i.test(text)) {
      task.model = process.env.CODRAI_REASONING_MODEL || "llama3.1";
      task.latencyTargetMs = task.latencyTargetMs || 12000;
      return;
    }
    task.model = process.env.CODRAI_FAST_MODEL || "deepseek-coder";
    task.latencyTargetMs = task.latencyTargetMs || 5000;
  }

  #rankForLowResource(task, candidates) {
    if (process.env.CODRAI_LOCAL_FIRST !== "true") return candidates;
    if (task.providerPreference && task.providerPreference !== "auto") return candidates;
    if (task.requiredCapabilities?.includes("vision") || task.input?.images?.length) return candidates;
    if (task.qualityTier === "premium" || task.qualityTier === "enterprise") return candidates;
    return [...candidates].sort((a, b) => {
      const aLocal = a.providerName === "ollama" ? 1 : 0;
      const bLocal = b.providerName === "ollama" ? 1 : 0;
      if (aLocal !== bLocal) return bLocal - aLocal;
      return 0;
    });
  }

  #rankForProviderPreference(task, candidates) {
    const preferred = [];
    if (task.providerPreference && task.providerPreference !== "auto") preferred.push(task.providerPreference);
    if (task.requiredCapabilities?.includes("vision") || task.input?.images?.length) preferred.push("gemini", "openai");
    if (task.qualityTier === "premium" || task.qualityTier === "enterprise") preferred.push("openai", "gemini");
    if (preferred.length === 0) return candidates;
    return [...candidates].sort((a, b) => {
      const aIndex = preferred.indexOf(a.providerName);
      const bIndex = preferred.indexOf(b.providerName);
      const aScore = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const bScore = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return aScore - bScore;
    });
  }
}
