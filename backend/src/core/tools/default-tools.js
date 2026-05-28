import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as cheerio from "cheerio";
import { promisify } from "node:util";
import { TOOL_CAPABILITIES, TOOL_EXECUTION_MODES, TOOL_RISK_LEVELS } from "./tool-types.js";

const execFileAsync = promisify(execFile);

export function registerDefaultTools(toolRegistry, services = {}) {
  toolRegistry.register({
    name: "calculator.evaluate",
    description: "Evaluate deterministic arithmetic expressions.",
    capabilities: [],
    riskLevel: TOOL_RISK_LEVELS.LOW,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    async execute({ input }) {
      const expression = String(input.expression || "");
      if (!/^[\d\s+\-*/().,%]+$/.test(expression)) {
        throw new Error("Calculator expression contains unsupported characters.");
      }
      const value = Function(`"use strict"; return (${expression.replace(/%/g, "/100")});`)();
      return { expression, value };
    },
  });

  toolRegistry.register({
    name: "browser.search",
    description: "Run a live web search and extract result titles/links.",
    capabilities: [TOOL_CAPABILITIES.NETWORK],
    riskLevel: TOOL_RISK_LEVELS.LOW,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    async execute({ input }) {
      const query = String(input.query || "");
      const response = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "CODRAI/1.0 (+https://codrai.local)" },
      });
      const html = await response.text();
      const $ = cheerio.load(html);
      const results = $(".result").slice(0, Number(input.limit || 8)).map((_, element) => ({
        title: $(element).find(".result__title").text().replace(/\s+/g, " ").trim(),
        url: $(element).find(".result__a").attr("href"),
        snippet: $(element).find(".result__snippet").text().replace(/\s+/g, " ").trim(),
      })).get();
      return { query, results };
    },
  });

  toolRegistry.register({
    name: "filesystem.read",
    description: "Read a file from the configured workspace root.",
    capabilities: [TOOL_CAPABILITIES.FILE_READ],
    riskLevel: TOOL_RISK_LEVELS.LOW,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    async execute({ input }) {
      const root = resolve(process.env.TOOL_WORKSPACE_ROOT || process.cwd());
      const target = resolve(root, input.path);
      if (!target.startsWith(root)) throw new Error("Path escapes workspace root.");
      return { path: input.path, content: await readFile(target, "utf8") };
    },
  });

  toolRegistry.register({
    name: "filesystem.write",
    description: "Write a file under the configured workspace root.",
    capabilities: [TOOL_CAPABILITIES.FILE_WRITE],
    riskLevel: TOOL_RISK_LEVELS.HIGH,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    async execute({ input }) {
      const root = resolve(process.env.TOOL_WORKSPACE_ROOT || process.cwd());
      const target = resolve(root, input.path);
      if (!target.startsWith(root)) throw new Error("Path escapes workspace root.");
      await writeFile(target, input.content || "", "utf8");
      return { path: input.path, bytes: Buffer.byteLength(input.content || "") };
    },
  });

  toolRegistry.register({
    name: "api.request",
    description: "Call an HTTP API endpoint with JSON request/response.",
    capabilities: [TOOL_CAPABILITIES.NETWORK],
    riskLevel: TOOL_RISK_LEVELS.MEDIUM,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    async execute({ input }) {
      const url = new URL(input.url);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) URLs are allowed.");
      const response = await fetch(url, {
        method: input.method || "GET",
        headers: input.headers || {},
        body: input.body ? JSON.stringify(input.body) : undefined,
      });
      const text = await response.text();
      return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body: text.slice(0, 50000) };
    },
  });

  toolRegistry.register({
    name: "terminal.exec",
    description: "Run an allowlisted command in an isolated working directory.",
    capabilities: [TOOL_CAPABILITIES.SHELL],
    riskLevel: TOOL_RISK_LEVELS.HIGH,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    async execute({ input }) {
      const allowed = new Set(["node", "npm", "npx"]);
      const command = input.command;
      if (!allowed.has(command)) throw new Error(`Command is not allowlisted: ${command}`);
      const args = Array.isArray(input.args) ? input.args : [];
      const { stdout, stderr } = await execFileAsync(command, args, {
        cwd: input.cwd || process.cwd(),
        timeout: Number(input.timeoutMs || 30000),
        maxBuffer: 1024 * 1024,
      });
      return { stdout, stderr };
    },
  });

  toolRegistry.register({
    name: "code.execute",
    description: "Execute Node.js code with timeout in an isolated process.",
    capabilities: [TOOL_CAPABILITIES.SHELL],
    riskLevel: TOOL_RISK_LEVELS.HIGH,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    async execute({ input }) {
      const { stdout, stderr } = await execFileAsync("node", ["--eval", String(input.code || "")], {
        timeout: Number(input.timeoutMs || 10000),
        maxBuffer: 1024 * 1024,
      });
      return { stdout, stderr };
    },
  });

  toolRegistry.register({
    name: "browser.navigate",
    description: "Navigate to a URL, extract page text, and optionally capture a screenshot.",
    capabilities: [TOOL_CAPABILITIES.NETWORK],
    riskLevel: TOOL_RISK_LEVELS.MEDIUM,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    execute({ input }) {
      if (!services.browserAutomation) throw new Error("Browser automation service is not configured.");
      return services.browserAutomation.navigate(input);
    },
  });

  toolRegistry.register({
    name: "browser.click",
    description: "Navigate to a URL and click a selector.",
    capabilities: [TOOL_CAPABILITIES.NETWORK],
    riskLevel: TOOL_RISK_LEVELS.MEDIUM,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    execute({ input }) {
      if (!services.browserAutomation) throw new Error("Browser automation service is not configured.");
      return services.browserAutomation.click(input);
    },
  });

  toolRegistry.register({
    name: "browser.fill",
    description: "Navigate to a URL, fill form fields, and optionally submit.",
    capabilities: [TOOL_CAPABILITIES.NETWORK],
    riskLevel: TOOL_RISK_LEVELS.HIGH,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    execute({ input }) {
      if (!services.browserAutomation) throw new Error("Browser automation service is not configured.");
      return services.browserAutomation.fill(input);
    },
  });

  toolRegistry.register({
    name: "browser.workflow",
    description: "Run a real multi-step browser workflow with navigation memory and final screenshot.",
    capabilities: [TOOL_CAPABILITIES.NETWORK],
    riskLevel: TOOL_RISK_LEVELS.HIGH,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    execute({ input }) {
      if (!services.browserAutomation) throw new Error("Browser automation service is not configured.");
      return services.browserAutomation.workflow(input);
    },
  });

  toolRegistry.register({
    name: "image.generate",
    description: "Generate an image through the configured AI runtime.",
    capabilities: [TOOL_CAPABILITIES.PROVIDER_CALL, TOOL_CAPABILITIES.ASSET_RENDER],
    riskLevel: TOOL_RISK_LEVELS.MEDIUM,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    execute({ input, workspaceId, projectId, actor }) {
      if (!services.aiRuntimeEngine) throw new Error("AI runtime engine is not configured.");
      return services.aiRuntimeEngine.execute({
        workspaceId,
        projectId,
        userId: actor?.id,
        taskType: "image",
        intent: input.prompt,
        input: { text: input.prompt, ...input },
        qualityTier: input.qualityTier || "balanced",
      });
    },
  });

  toolRegistry.register({
    name: "app.generate",
    description: "Generate a React + Node app and persist project files.",
    capabilities: [TOOL_CAPABILITIES.PROVIDER_CALL],
    riskLevel: TOOL_RISK_LEVELS.MEDIUM,
    executionMode: TOOL_EXECUTION_MODES.SYNC,
  }, {
    execute({ input, workspaceId, projectId, actor }) {
      if (!services.appProjectGenerator) throw new Error("App project generator is not configured.");
      return services.appProjectGenerator.generate({
        workspaceId,
        projectId,
        userId: actor?.id,
        goal: input.goal || input.prompt,
      });
    },
  });
}
