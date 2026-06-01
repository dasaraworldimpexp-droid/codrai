import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSpaFallbackMiddleware } from "./spa-fallback.middleware.mjs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const distDir = resolve(rootDir, "dist");
const indexFile = join(distDir, "index.html");
const port = Number(process.env.PORT || process.env.FRONTEND_PORT || 4173);
const backendUrl = String(process.env.CODRAI_BACKEND_URL || process.env.BACKEND_URL || "").replace(/\/+$/, "");

const spaFallback = createSpaFallbackMiddleware({ distDir, indexFile });

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function backendTargetUrl(pathname, search) {
  if (!backendUrl) return null;
  if (backendUrl.endsWith("/api")) {
    return `${backendUrl}${pathname.slice("/api".length)}${search}`;
  }
  return `${backendUrl}${pathname}${search}`;
}

function proxyHeaders(req) {
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["content-length"];
  return headers;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function proxyToBackend(req, res, url) {
  try {
    const hasBody = !["GET", "HEAD"].includes(req.method || "GET");
    const body = hasBody ? await readRequestBody(req) : undefined;
    const response = await fetch(url, {
      method: req.method,
      headers: proxyHeaders(req),
      body,
    });
    const headers = Object.fromEntries(response.headers.entries());
    res.writeHead(response.status, headers);
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    sendJson(res, 502, {
      message: "CODRAI backend is unreachable from the Hostinger frontend server.",
      detail: error.cause?.message || error.message,
    });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    const target = backendTargetUrl(pathname, url.search);
    if (!target) {
      sendJson(res, 503, {
        message: "CODRAI backend URL is not configured for Hostinger Node.js deployment.",
        requiredEnvironment: "Set CODRAI_BACKEND_URL or BACKEND_URL to the backend origin, for example https://codraios.com or http://127.0.0.1:5000.",
      });
      return;
    }
    await proxyToBackend(req, res, target);
    return;
  }

  if (pathname === "/ws" || pathname.startsWith("/socket.io/")) {
    sendJson(res, 503, {
      message: "Realtime backend routing requires the production reverse proxy or a backend WebSocket endpoint.",
      requiredEnvironment: "Route /ws and /socket.io/ to the CODRAI backend in Hostinger or Nginx.",
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { message: "Method not allowed by CODRAI frontend server." });
    return;
  }

  if (pathname === "/health" || pathname === "/healthz") {
    sendJson(res, 200, { status: "ok", service: "codrai-frontend", backendConfigured: Boolean(backendUrl) });
    return;
  }

  spaFallback(req, res);
});

server.listen(port, () => {
  console.log(`CODRAI frontend serving ${distDir} on http://0.0.0.0:${port}`);
  console.log(backendUrl ? `CODRAI frontend proxying /api to ${backendUrl}` : "CODRAI frontend /api proxy disabled: CODRAI_BACKEND_URL or BACKEND_URL is not set.");
});
