import { randomUUID } from "node:crypto";
import { RUNTIME_EXECUTION_MODES } from "../core/runtime/runtime-types.js";

function correlationId(req) {
  return req.headers["x-correlation-id"] || req.headers["x-request-id"] || randomUUID();
}

function messagesToPrompt(messages = []) {
  return messages.map((message) => `${message.role || "user"}: ${message.content || ""}`).join("\n");
}

function estimateUsage(service, prompt, output) {
  const promptTokens = service.estimateTokens(prompt);
  const completionTokens = service.estimateTokens(output);
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  };
}

function openAiError(res, status, message, code = "codrai_api_error", type = "api_error", correlation) {
  return res.status(status).json({
    error: { message, type, code },
    correlation_id: correlation,
  });
}

async function record(req, payload) {
  await req.app.locals.developerApiKeyService.recordUsage({
    workspaceId: req.developerApiKey.workspaceId,
    userId: req.developerApiKey.userId,
    apiKeyId: req.developerApiKey.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    ...payload,
  });
}

export async function publicApiHealth(req, res) {
  return res.status(200).json({
    status: "ok",
    platform: "CODRAI Developer API",
    workspace_id: req.developerApiKey.workspaceId,
    timestamp: new Date().toISOString(),
  });
}

export async function publicModels(req, res) {
  const providers = req.app.locals.providerRegistry?.listProviders?.() || [];
  return res.status(200).json({
    object: "list",
    data: providers
      .filter((provider) => provider.providerType === "llm")
      .map((provider) => ({
        id: provider.defaultModel || provider.providerName,
        object: "model",
        owned_by: provider.providerName,
        capabilities: provider.capabilities || [],
        supports_streaming: Boolean(provider.supportsStreaming),
        max_tokens: provider.maxTokens || null,
      })),
  });
}

export async function publicProviders(req, res) {
  const providers = req.app.locals.providerRegistry?.listProviders?.() || [];
  return res.status(200).json({
    object: "list",
    data: providers.map((provider) => ({
      id: provider.providerName,
      type: provider.providerType,
      capabilities: provider.capabilities || [],
      supports_streaming: Boolean(provider.supportsStreaming),
      score: req.app.locals.providerHealthService?.scoreProvider?.(provider),
    })),
  });
}

export async function publicUsage(req, res, next) {
  try {
    const usage = await req.app.locals.developerApiKeyService.usageSummary({
      workspaceId: req.developerApiKey.workspaceId,
      limit: req.query.limit,
    });
    return res.status(200).json(usage);
  } catch (error) {
    return next(error);
  }
}

export async function publicChatCompletions(req, res) {
  const startedAt = Date.now();
  const cid = correlationId(req);
  const model = req.body.model || "codrai-balanced";
  const prompt = messagesToPrompt(req.body.messages || []);

  if (req.body.stream === true) {
    return publicChatStream(req, res);
  }

  try {
    const result = await req.app.locals.runtimeEngine.execute({
      workspaceId: req.developerApiKey.workspaceId,
      userId: req.developerApiKey.userId,
      taskType: "reasoning",
      qualityTier: req.body.qualityTier || "balanced",
      requestedModel: model,
      intent: prompt,
      input: { text: prompt, messages: req.body.messages || [] },
    });
    const text = result.result?.output?.text || result.output?.text || "";
    const usage = result.result?.usage || estimateUsage(req.app.locals.developerApiKeyService, prompt, text);
    await record(req, {
      route: "/api/v1/chat/completions",
      method: "POST",
      model,
      provider: result.result?.provider,
      status: "success",
      requestTokens: usage.prompt_tokens || usage.input_tokens || 0,
      responseTokens: usage.completion_tokens || usage.output_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      latencyMs: Date.now() - startedAt,
      correlationId: cid,
    });
    return res.status(200).json({
      id: `chatcmpl_${result.taskId || randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      correlation_id: cid,
      choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
      usage,
    });
  } catch (error) {
    await record(req, {
      route: "/api/v1/chat/completions",
      method: "POST",
      model,
      status: "error",
      latencyMs: Date.now() - startedAt,
      correlationId: cid,
      errorCode: error.code || "runtime_error",
      errorMessage: error.message,
    });
    return openAiError(res, error.statusCode || 503, error.message || "CODRAI completion failed.", error.code || "runtime_error", "runtime_error", cid);
  }
}

export async function publicChatStream(req, res) {
  const startedAt = Date.now();
  const cid = correlationId(req);
  const model = req.body.model || "codrai-balanced";
  const prompt = messagesToPrompt(req.body.messages || []);
  const taskId = randomUUID();
  let unsubscribe;

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Correlation-Id", cid);
    res.flushHeaders?.();

    const channel = `conversation:${taskId}`;
    unsubscribe = req.app.locals.eventBus?.subscribe?.(channel, (event) => {
      const text = event.payload?.chunk?.text;
      if (event.type?.includes("stream") && text) {
        res.write(`data: ${JSON.stringify({
          id: `chatcmpl_${taskId}`,
          object: "chat.completion.chunk",
          model,
          correlation_id: cid,
          choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
        })}\n\n`);
      }
    });

    const abortController = new AbortController();
    req.on("close", () => abortController.abort());
    const result = await req.app.locals.runtimeEngine.execute({
      id: taskId,
      workspaceId: req.developerApiKey.workspaceId,
      userId: req.developerApiKey.userId,
      conversationId: taskId,
      taskType: "reasoning",
      qualityTier: req.body.qualityTier || "balanced",
      requestedModel: model,
      intent: prompt,
      input: { text: prompt, messages: req.body.messages || [] },
    }, {
      executionMode: RUNTIME_EXECUTION_MODES.STREAM,
      signal: abortController.signal,
    });
    const usage = result.usage || estimateUsage(req.app.locals.developerApiKeyService, prompt, result.output?.text);
    await record(req, {
      route: "/api/v1/chat/stream",
      method: "POST",
      model,
      status: "success",
      requestTokens: usage.prompt_tokens || usage.input_tokens || 0,
      responseTokens: usage.completion_tokens || usage.output_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      latencyMs: Date.now() - startedAt,
      correlationId: cid,
    });
    res.write(`data: ${JSON.stringify({ id: `chatcmpl_${taskId}`, object: "chat.completion.chunk", model, correlation_id: cid, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage })}\n\n`);
    res.write("data: [DONE]\n\n");
    unsubscribe?.();
    return res.end();
  } catch (error) {
    unsubscribe?.();
    await record(req, {
      route: "/api/v1/chat/stream",
      method: "POST",
      model,
      status: "error",
      latencyMs: Date.now() - startedAt,
      correlationId: cid,
      errorCode: error.code || "runtime_error",
      errorMessage: error.message,
    });
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: { message: error.message, type: "runtime_error", code: error.code || "runtime_error" }, correlation_id: cid })}\n\n`);
      return res.end();
    }
    return openAiError(res, error.statusCode || 503, error.message || "CODRAI stream failed.", error.code || "runtime_error", "runtime_error", cid);
  }
}
