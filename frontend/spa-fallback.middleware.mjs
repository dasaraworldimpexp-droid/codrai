import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, normalize, resolve, sep } from "node:path";

const DEFAULT_MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function isInsideRoot(filePath, rootDir) {
  const normalizedRoot = normalize(rootDir);
  const normalizedFile = normalize(filePath);
  const relative = normalizedFile.replace(normalizedRoot, "");
  return normalizedFile === normalizedRoot || (normalizedFile.startsWith(normalizedRoot + sep) && !relative.includes(`..${sep}`));
}

function sendFile(req, res, filePath, cacheControl, mimeTypes) {
  const extension = extname(filePath).toLowerCase();
  const headers = {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": cacheControl,
  };

  if (req.method === "HEAD") {
    res.writeHead(200, headers);
    res.end();
    return true;
  }

  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
  return true;
}

export function createSpaFallbackMiddleware({
  distDir,
  indexFile,
  reservedPrefixes = ["/api/", "/socket.io/"],
  reservedPaths = ["/ws"],
  immutablePrefix = "/assets/",
  mimeTypes = DEFAULT_MIME_TYPES,
} = {}) {
  if (!distDir) throw new Error("createSpaFallbackMiddleware requires distDir.");
  if (!indexFile) throw new Error("createSpaFallbackMiddleware requires indexFile.");

  const resolvedDist = resolve(distDir);
  const resolvedIndex = resolve(indexFile);

  return function spaFallbackMiddleware(req, res) {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (reservedPaths.includes(pathname) || reservedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return false;
    }

    if (!["GET", "HEAD"].includes(req.method || "GET")) {
      return false;
    }

    const safePath = decodeURIComponent(pathname).split("/").filter(Boolean).join("/");
    const candidate = resolve(resolvedDist, safePath);
    const staticFile = isInsideRoot(candidate, resolvedDist) && existsSync(candidate) && statSync(candidate).isFile()
      ? candidate
      : null;

    if (staticFile) {
      const immutable = pathname.startsWith(immutablePrefix);
      return sendFile(req, res, staticFile, immutable ? "public, max-age=31536000, immutable" : "no-store", mimeTypes);
    }

    if (!existsSync(resolvedIndex)) {
      res.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify({ message: "SPA index.html was not found. Run npm run build before starting production." }));
      return true;
    }

    return sendFile(req, res, resolvedIndex, "no-store", mimeTypes);
  };
}
