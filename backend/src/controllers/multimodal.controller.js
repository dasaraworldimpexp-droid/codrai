import multer from "multer";

export const multimodalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MULTIMODAL_UPLOAD_LIMIT_BYTES || 12 * 1024 * 1024) },
});

const workspace = (req) => req.workspace?.id || req.body.workspaceId || req.query.workspaceId || "local-workspace";

export async function multimodalStatus(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.status({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function ocrImage(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.ocrImage({
      workspaceId: workspace(req),
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      file: req.file,
      language: req.body.language || "eng",
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function parseDocument(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.parseDocument({
      workspaceId: workspace(req),
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      file: req.file,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function inspectMedia(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.inspectMedia({
      workspaceId: workspace(req),
      projectId: req.body.projectId,
      userId: req.user?.id || req.body.userId,
      file: req.file,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function transcribeAudio(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.transcribeAudio({
      workspaceId: workspace(req),
      projectId: req.body.projectId || req.query.projectId,
      userId: req.user?.id || req.body.userId,
      file: req.file,
    });
    return res.status(result.status === "blocked" ? 200 : 201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function queueTranscription(req, res, next) {
  try {
    if (!req.file?.buffer) return res.status(400).json({ message: "Audio file is required." });
    const workspaceId = workspace(req);
    const job = await req.app.locals.backgroundProcessor.enqueue({
      queueName: "multimodal.transcription",
      workspaceId,
      projectId: req.body.projectId || req.query.projectId || null,
      kind: "multimodal_transcription",
      payload: {
        workspaceId,
        projectId: req.body.projectId || req.query.projectId || null,
        userId: req.user?.id || req.body.userId || null,
        file: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          bufferBase64: req.file.buffer.toString("base64"),
        },
      },
      idempotencyKey: req.body.idempotencyKey || undefined,
    });
    return res.status(202).json({
      status: "queued",
      job: {
        id: job.id,
        queueName: job.queueName,
        kind: job.kind,
        status: job.status,
        workspaceId: job.workspaceId,
        projectId: job.projectId,
        createdAt: job.createdAt,
        file: {
          name: req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function transcriptHistory(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.transcriptHistory({
      workspaceId: workspace(req),
      projectId: req.query.projectId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function searchTranscripts(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.searchTranscripts({
      workspaceId: workspace(req),
      projectId: req.query.projectId,
      query: req.query.query,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function transcriptAnalytics(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.transcriptAnalytics({
      workspaceId: workspace(req),
      projectId: req.query.projectId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function exportTranscript(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.transcriptExport({
      workspaceId: workspace(req),
      transcriptId: req.params.transcriptId,
      format: req.query.format || "json",
    });
    if (result.body != null) {
      res.setHeader("Content-Type", result.contentType || "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
      return res.status(200).send(result.body);
    }
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function whisperDiagnostics(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.whisperDiagnostics({
      workspaceId: workspace(req),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function bootstrapWhisper(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.bootstrapWhisper({
      workspaceId: workspace(req),
    });
    return res.status(result.status === "ready" ? 200 : 202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function analyzeImage(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.analyzeImage({
      workspaceId: workspace(req),
      projectId: req.body.projectId || req.query.projectId,
      userId: req.user?.id || req.body.userId,
      file: req.file,
      prompt: req.body.prompt,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function desktopStatus(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.desktopStatus();
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function desktopAction(req, res, next) {
  try {
    const result = await req.app.locals.multimodalCapabilityService.desktopAction({
      workspaceId: workspace(req),
      projectId: req.body.projectId || req.query.projectId,
      userId: req.user?.id || req.body.userId,
      action: req.body.action,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
