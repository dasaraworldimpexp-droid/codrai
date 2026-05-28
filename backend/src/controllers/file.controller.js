import { ChunkingService } from "../core/files/chunking.service.js";
import { FileIndexingService } from "../core/files/file-indexing.service.js";
import { FileStorageService } from "../core/files/file-storage.service.js";
import { FileTextExtractorService } from "../core/files/file-text-extractor.service.js";
import { ObjectStorageService } from "../core/storage/object-storage.service.js";

function indexingService(req) {
  let openai = null;
  try {
    openai = req.app.locals.providerRegistry?.get("openai");
  } catch {
    openai = null;
  }
  return new FileIndexingService({
    pool: req.app.locals.pool,
    embeddingProvider: openai,
    embeddingRuntime: req.app.locals.embeddingRuntime,
    storageService: new FileStorageService(),
    textExtractor: new FileTextExtractorService(),
    chunkingService: new ChunkingService(),
  });
}

export async function uploadFiles(req, res, next) {
  try {
    const service = indexingService(req);
    const workspaceId = req.body.workspaceId || req.workspace?.id;
    const userId = req.body.userId || req.user?.id;
    const results = [];

    for (const file of req.files || []) {
      results.push(await service.ingest({ file, workspaceId, projectId: req.body.projectId, userId }));
    }

    return res.status(201).json({ files: results });
  } catch (error) {
    return next(error);
  }
}

export async function searchFiles(req, res, next) {
  try {
    const service = indexingService(req);
    const results = await service.search({
      workspaceId: req.query.workspaceId || req.workspace?.id,
      projectId: req.query.projectId,
      query: req.query.q,
      limit: Number(req.query.limit || 8),
    });
    return res.status(200).json({ results });
  } catch (error) {
    return next(error);
  }
}

export async function objectStorageStatus(_req, res) {
  const storage = new ObjectStorageService();
  return res.status(200).json({ status: "ready", storage: storage.provider() });
}

export async function uploadObjects(req, res, next) {
  try {
    const storage = new ObjectStorageService();
    const workspaceId = req.body.workspaceId || req.workspace?.id || "local-workspace";
    const kind = req.body.kind || "upload";
    const objects = [];
    for (const file of req.files || []) {
      objects.push(await storage.put({
        workspaceId,
        kind,
        buffer: file.buffer,
        originalName: file.originalname,
        contentType: file.mimetype,
      }));
    }
    return res.status(201).json({ status: "stored", workspaceId, objects });
  } catch (error) {
    return next(error);
  }
}

export async function listObjects(req, res, next) {
  try {
    const storage = new ObjectStorageService();
    const workspaceId = req.query.workspaceId || req.workspace?.id || "local-workspace";
    const objects = await storage.list({ workspaceId, kind: req.query.kind, limit: Number(req.query.limit || 50) });
    return res.status(200).json({ status: "ready", workspaceId, objects });
  } catch (error) {
    return next(error);
  }
}

export async function readSignedObject(req, res, next) {
  try {
    const storage = new ObjectStorageService();
    const object = await storage.readSigned({
      key: decodeURIComponent(req.params.key),
      expires: req.query.expires,
      signature: req.query.signature,
    });
    res.setHeader("Cache-Control", "private, max-age=60");
    res.setHeader("Content-Length", object.metadata.size);
    return object.stream.pipe(res);
  } catch (error) {
    return next(error);
  }
}
