import { randomUUID } from "node:crypto";
import { TOOL_CAPABILITIES, TOOL_EXECUTION_MODES, TOOL_RISK_LEVELS } from "./tool-types.js";

export class DynamicToolService {
  constructor({ pool, toolRegistry, eventBus }) {
    this.pool = pool;
    this.toolRegistry = toolRegistry;
    this.eventBus = eventBus;
  }

  async create({ workspaceId, userId, name, description, kind, configuration = {}, permissions = [] }) {
    if (!this.pool) throw new Error("Dynamic tools require PostgreSQL DATABASE_URL.");
    if (!workspaceId || !name || !kind) throw new Error("workspaceId, name, and kind are required.");
    const normalizedName = this.#toolName(workspaceId, name);
    const manifest = this.#manifest({ name: normalizedName, description, kind, permissions });
    await this.pool.query(
      `insert into dynamic_tools
       (id, workspace_id, name, description, kind, manifest, configuration, permissions, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
       on conflict (workspace_id, name) do update set
         description = excluded.description,
         kind = excluded.kind,
         manifest = excluded.manifest,
         configuration = excluded.configuration,
         permissions = excluded.permissions,
         status = 'active',
         updated_at = now()`,
      [randomUUID(), workspaceId, normalizedName, description || null, kind, manifest, configuration, permissions, userId || null]
    );
    this.registerRuntimeTool({ manifest, kind, configuration, workspaceId });
    await this.#event({ workspaceId, userId, type: "dynamic_tool.created", payload: { name: normalizedName, kind } });
    return this.get({ workspaceId, name: normalizedName });
  }

  async list({ workspaceId }) {
    const result = await this.pool.query("select * from dynamic_tools where workspace_id = $1 order by created_at desc", [workspaceId]);
    return result.rows;
  }

  async get({ workspaceId, name }) {
    const result = await this.pool.query("select * from dynamic_tools where workspace_id = $1 and name = $2", [workspaceId, name]);
    if (!result.rows[0]) throw new Error("Dynamic tool not found.");
    return result.rows[0];
  }

  async loadWorkspaceTools() {
    if (!this.pool) return;
    const result = await this.pool.query("select * from dynamic_tools where status = 'active'");
    for (const tool of result.rows) {
      this.registerRuntimeTool({
        manifest: tool.manifest,
        kind: tool.kind,
        configuration: tool.configuration,
        workspaceId: tool.workspace_id,
      });
    }
  }

  registerRuntimeTool({ manifest, kind, configuration, workspaceId }) {
    if (kind === "api_request") {
      this.toolRegistry.register(manifest, {
        async execute({ input }) {
          const url = new URL(input.url || configuration.url);
          const response = await fetch(url, {
            method: input.method || configuration.method || "GET",
            headers: { ...(configuration.headers || {}), ...(input.headers || {}) },
            body: input.body ? JSON.stringify(input.body) : configuration.body ? JSON.stringify(configuration.body) : undefined,
          });
          const text = await response.text();
          return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body: text.slice(0, 50000) };
        },
      });
      return;
    }
    if (kind === "browser_extract") {
      this.toolRegistry.register(manifest, {
        async execute() {
          const response = await fetch(configuration.url);
          return { url: configuration.url, body: (await response.text()).slice(0, 50000) };
        },
      });
      return;
    }
    throw new Error(`Unsupported dynamic tool kind: ${kind}`);
  }

  #manifest({ name, description, kind, permissions }) {
    return {
      name,
      description: description || `Dynamic ${kind} tool`,
      capabilities: kind === "api_request" ? [TOOL_CAPABILITIES.NETWORK] : [TOOL_CAPABILITIES.NETWORK],
      riskLevel: permissions.includes("high_risk") ? TOOL_RISK_LEVELS.HIGH : TOOL_RISK_LEVELS.MEDIUM,
      executionMode: TOOL_EXECUTION_MODES.SYNC,
    };
  }

  #toolName(workspaceId, name) {
    const slug = String(name).toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
    return `dynamic.${workspaceId}.${slug}`;
  }

  #event({ workspaceId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, actorId: userId, payload });
  }
}
