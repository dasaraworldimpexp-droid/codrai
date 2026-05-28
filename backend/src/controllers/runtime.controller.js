import { randomUUID } from "node:crypto";
import { RUNTIME_EXECUTION_MODES } from "../core/runtime/runtime-types.js";

export async function executeRuntimeTask(req, res, next) {
  try {
    const runtimeEngine = req.app.locals.runtimeEngine;

    if (!runtimeEngine) {
      return res.status(503).json({ message: "AI runtime engine is not configured." });
    }

    const result = await runtimeEngine.execute({
      ...req.body,
      userId: req.user?.id || req.body.userId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
    });

    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function streamRuntimeTask(req, res, next) {
  let unsubscribe;
  try {
    const runtimeEngine = req.app.locals.runtimeEngine;
    const eventBus = req.app.locals.eventBus;

    if (!runtimeEngine) {
      return res.status(503).json({ message: "AI runtime engine is not configured." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => abortController.abort());
    const taskId = req.body.id || randomUUID();
    const channel = `conversation:${req.body.conversationId || taskId}`;
    unsubscribe = eventBus?.subscribe?.(channel, (event) => {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    const result = await runtimeEngine.execute(
      {
        ...req.body,
        id: taskId,
        userId: req.user?.id || req.body.userId,
        workspaceId: req.workspace?.id || req.body.workspaceId,
      },
      {
        executionMode: RUNTIME_EXECUTION_MODES.STREAM,
        signal: abortController.signal,
      }
    );

    res.write(`event: final\ndata: ${JSON.stringify(result)}\n\n`);
    unsubscribe?.();
    return res.end();
  } catch (error) {
    unsubscribe?.();
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({
        type: "runtime.error",
        payload: {
          message: error.message || "AI runtime stream failed.",
          code: error.code || "RUNTIME_STREAM_ERROR",
        },
        createdAt: new Date().toISOString(),
      })}\n\n`);
      return res.end();
    }
    return next(error);
  }
}
