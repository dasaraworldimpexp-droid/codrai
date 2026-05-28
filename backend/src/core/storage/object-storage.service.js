import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = process.env.OBJECT_STORAGE_DIR || path.resolve(process.cwd(), "..", "storage", "objects");
const SIGNING_SECRET = process.env.OBJECT_STORAGE_SIGNING_SECRET || process.env.JWT_SECRET || "codrai-local-object-storage";

export class ObjectStorageService {
  constructor({ root = STORAGE_ROOT } = {}) {
    this.root = root;
  }

  provider() {
    return {
      mode: process.env.S3_BUCKET || process.env.R2_BUCKET || process.env.MINIO_ENDPOINT ? "external_ready" : "local_filesystem",
      root: this.root,
      signedUrls: true,
      cdnReady: Boolean(process.env.CDN_BASE_URL),
      external: {
        s3Bucket: Boolean(process.env.S3_BUCKET),
        r2Bucket: Boolean(process.env.R2_BUCKET),
        minioEndpoint: Boolean(process.env.MINIO_ENDPOINT),
      },
    };
  }

  async put({ workspaceId, buffer, originalName, contentType, kind = "upload" }) {
    if (!workspaceId) throw Object.assign(new Error("workspaceId is required."), { statusCode: 400 });
    if (!buffer?.length) throw Object.assign(new Error("file buffer is required."), { statusCode: 400 });
    const id = randomUUID();
    const safeName = this.#safeName(originalName || "object.bin");
    const key = `${workspaceId}/${kind}/${id}-${safeName}`;
    const filePath = this.#pathForKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    const metadata = {
      id,
      key,
      workspaceId,
      originalName: safeName,
      contentType: contentType || "application/octet-stream",
      sizeBytes: buffer.length,
      storedAt: new Date().toISOString(),
      provider: this.provider().mode,
    };
    return { ...metadata, signedUrl: this.sign({ key, expiresInSeconds: 900 }).url };
  }

  async list({ workspaceId, kind, limit = 50 }) {
    if (!workspaceId) throw Object.assign(new Error("workspaceId is required."), { statusCode: 400 });
    const prefix = path.join(this.root, workspaceId, kind || "");
    const objects = [];
    await this.#walk(prefix, objects, Number(limit));
    return objects.map((filePath) => {
      const key = path.relative(this.root, filePath).replace(/\\/g, "/");
      return { key, signedUrl: this.sign({ key, expiresInSeconds: 900 }).url };
    });
  }

  sign({ key, expiresInSeconds = 900 }) {
    const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresInSeconds);
    const signature = this.#signature(key, expiresAt);
    return { key, expiresAt, url: `/api/files/objects/${encodeURIComponent(key)}?expires=${expiresAt}&signature=${signature}` };
  }

  async readSigned({ key, expires, signature }) {
    const expiresAt = Number(expires);
    if (!key || !signature || !Number.isFinite(expiresAt)) throw Object.assign(new Error("Invalid signed object URL."), { statusCode: 400 });
    if (Date.now() / 1000 > expiresAt) throw Object.assign(new Error("Signed object URL has expired."), { statusCode: 403 });
    const expected = this.#signature(key, expiresAt);
    if (!this.#safeEqual(signature, expected)) throw Object.assign(new Error("Signed object URL signature is invalid."), { statusCode: 403 });
    const filePath = this.#pathForKey(key);
    await access(filePath);
    const metadata = await stat(filePath);
    return { stream: createReadStream(filePath), metadata };
  }

  async #walk(root, output, limit) {
    try {
      const entries = await readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (output.length >= limit) return;
        const child = path.join(root, entry.name);
        if (entry.isDirectory()) await this.#walk(child, output, limit);
        else output.push(child);
      }
    } catch {
      // Missing workspace/kind directory simply means no objects are stored yet.
    }
  }

  #pathForKey(key) {
    const normalized = String(key).replace(/\\/g, "/").replace(/\.\.+/g, "").replace(/^\/+/, "");
    return path.join(this.root, normalized);
  }

  #signature(key, expiresAt) {
    return createHmac("sha256", SIGNING_SECRET).update(`${key}:${expiresAt}`).digest("hex");
  }

  #safeEqual(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    return left.length === right.length && timingSafeEqual(left, right);
  }

  #safeName(value) {
    return String(value || "object.bin").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140);
  }
}
