import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const distDir = resolve(rootDir, "dist");
const indexFile = join(distDir, "index.html");
const port = Number(process.env.PORT || process.env.FRONTEND_PORT || 4173);

const mimeTypes = {
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

function isInsideDist(filePath) {
  const relative = normalize(filePath).replace(distDir, "");
  return filePath === distDir || (filePath.startsWith(distDir + sep) && !relative.includes(`..${sep}`));
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendFile(req, res, filePath, cacheControl = "no-store") {
  const extension = extname(filePath).toLowerCase();
  const headers = {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": cacheControl,
  };

  if (req.method === "HEAD") {
    res.writeHead(200, headers);
    res.end();
    return;
  }

  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

function resolveStaticPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const safePath = decodedPath.split("/").filter(Boolean).join("/");
  const candidate = resolve(distDir, safePath);

  if (!isInsideDist(candidate)) return null;
  if (!existsSync(candidate)) return null;
  if (!statSync(candidate).isFile()) return null;

  return candidate;
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { message: "Method not allowed by CODRAI frontend server." });
    return;
  }

  if (pathname === "/health" || pathname === "/healthz") {
    sendJson(res, 200, { status: "ok", service: "codrai-frontend" });
    return;
  }

  if (pathname.startsWith("/api/") || pathname === "/ws" || pathname.startsWith("/socket.io/")) {
    sendJson(res, 404, {
      message: "Frontend server received a backend route. Configure Hostinger or Nginx to route this path to the CODRAI backend.",
    });
    return;
  }

  const staticFile = resolveStaticPath(pathname);
  if (staticFile) {
    const immutable = pathname.startsWith("/assets/");
    sendFile(req, res, staticFile, immutable ? "public, max-age=31536000, immutable" : "no-store");
    return;
  }

  if (!existsSync(indexFile)) {
    sendJson(res, 500, { message: "CODRAI frontend build not found. Run npm run build before starting production." });
    return;
  }

  sendFile(req, res, indexFile, "no-store");
});

server.listen(port, () => {
  console.log(`CODRAI frontend serving ${distDir} on http://0.0.0.0:${port}`);
});
