import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import net from "node:net";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(__dirname, "..", "..", "db", "migrations", "001_execution_core.sql");

export class InfrastructureSupervisorService {
  constructor({ pool, redis, eventBus, workspaceId = "system" }) {
    this.pool = pool;
    this.redis = redis;
    this.eventBus = eventBus;
    this.workspaceId = workspaceId;
  }

  async diagnostics() {
    const [postgresPort, redisPort, docker, psql, redisServer, postgres, redis, migrations, websocket, persistence] = await Promise.all([
      this.#port("localhost", 5432),
      this.#port("localhost", 6379),
      this.#command("docker", ["--version"]),
      this.#command("psql", ["--version"]),
      this.#command("redis-server", ["--version"]),
      this.#postgres(),
      this.#redis(),
      this.#migrationReadiness(),
      this.#websocketReadiness(),
      this.#persistenceProbe(),
    ]);

    const checks = {
      postgresPort,
      redisPort,
      docker,
      psql,
      redisServer,
      postgres,
      redis,
      migrations,
      websocket,
      persistence,
      realtimeEvents: this.eventBus?.snapshot?.() || null,
    };

    return {
      status: this.#status(checks),
      readinessScore: this.#score(checks),
      checks,
      recommendations: this.#recommendations(checks),
      generatedAt: new Date().toISOString(),
    };
  }

  async recover({ runMigrations = false } = {}) {
    const before = await this.diagnostics();
    const actions = [];

    if (before.checks.docker.available && (!before.checks.postgresPort.open || !before.checks.redisPort.open)) {
      actions.push(await this.#attempt("docker-compose.up.infrastructure", "docker", ["compose", "up", "-d", "postgres", "redis"]));
    }

    if (!before.checks.postgresPort.open && before.checks.psql.available) {
      actions.push({ name: "postgres.local-service", status: "manual_required", detail: "psql exists but no PostgreSQL service was detected from this process." });
    }

    if (!before.checks.redisPort.open && before.checks.redisServer.available) {
      actions.push({ name: "redis.local-service", status: "manual_required", detail: "redis-server exists but no Redis service is listening on 6379." });
    }

    const flush = await this.eventBus?.flushBufferedEvents?.();
    if (flush) actions.push({ name: "realtime.buffer.flush", status: flush.remaining === 0 ? "ok" : "deferred", detail: flush });

    if (runMigrations) {
      actions.push(await this.#runMigrations());
    }

    const after = await this.diagnostics();
    await this.#event("infrastructure.recovery.completed", { before: before.status, after: after.status, actions });

    return { before, actions, after };
  }

  async verifyProductionRuntime() {
    const diagnostics = await this.diagnostics();
    const tables = await this.#tableProbe();
    const crud = await this.#crudProbe();

    return {
      status: diagnostics.status === "ready" && tables.status === "ok" && crud.status === "ok" ? "ready" : "blocked",
      diagnostics,
      tables,
      crud,
      verifiedAt: new Date().toISOString(),
    };
  }

  async #postgres() {
    if (!this.pool) return { status: "not_configured" };
    try {
      const startedAt = Date.now();
      await this.pool.query("select 1");
      return { status: "ok", latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { status: "down", error: this.#errorMessage(error) };
    }
  }

  async #redis() {
    if (!this.redis) return { status: "not_configured" };
    try {
      const startedAt = Date.now();
      const response = await this.redis.ping();
      return { status: response === "PONG" ? "ok" : "degraded", response, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { status: "down", error: this.#errorMessage(error) };
    }
  }

  async #migrationReadiness() {
    try {
      await access(migrationPath);
      return { status: "available", path: migrationPath };
    } catch (error) {
      return { status: "missing", error: this.#errorMessage(error) };
    }
  }

  async #runMigrations() {
    if (!this.pool) return { name: "postgres.migrations", status: "blocked", error: "DATABASE_URL is not configured." };
    try {
      const sql = await readFile(migrationPath, "utf8");
      await this.pool.query(sql);
      return { name: "postgres.migrations", status: "ok" };
    } catch (error) {
      return { name: "postgres.migrations", status: "blocked", error: this.#errorMessage(error) };
    }
  }

  async #tableProbe() {
    if (!this.pool) return { status: "blocked", error: "DATABASE_URL is not configured." };
    const expected = [
      "realtime_events",
      "runtime_telemetry",
      "distributed_execution_tasks",
      "swarm_clusters",
      "civilization_agent_identities",
      "planetary_world_models",
      "cosmos_universes",
    ];

    try {
      const result = await this.pool.query(
        "select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1)",
        [expected]
      );
      const found = result.rows.map((row) => row.table_name);
      const missing = expected.filter((table) => !found.includes(table));
      return { status: missing.length ? "incomplete" : "ok", found, missing };
    } catch (error) {
      return { status: "blocked", error: this.#errorMessage(error) };
    }
  }

  async #crudProbe() {
    if (!this.pool) return { status: "blocked", error: "DATABASE_URL is not configured." };
    const id = `infra-probe-${Date.now()}`;
    try {
      await this.pool.query(
        `insert into realtime_events (id, workspace_id, channel, type, payload, created_at)
         values ($1, $2, $3, $4, $5, now())`,
        [id, this.workspaceId, "infrastructure", "infrastructure.probe.created", { id }]
      );
      await this.pool.query("update realtime_events set payload = payload || $2::jsonb where id = $1", [id, { updated: true }]);
      const read = await this.pool.query("select id from realtime_events where id = $1", [id]);
      await this.pool.query("delete from realtime_events where id = $1", [id]);
      return { status: read.rowCount === 1 ? "ok" : "failed", id };
    } catch (error) {
      return { status: "blocked", error: this.#errorMessage(error) };
    }
  }

  async #persistenceProbe() {
    const [tables, crud] = await Promise.all([this.#tableProbe(), this.#crudProbe()]);
    return { status: tables.status === "ok" && crud.status === "ok" ? "ok" : "blocked", tables, crud };
  }

  async #websocketReadiness() {
    return { status: "configured", endpoint: "/ws", socketIoPath: "/socket.io" };
  }

  #port(host, port) {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port, timeout: 1500 });
      socket.on("connect", () => {
        socket.destroy();
        resolve({ host, port, open: true });
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve({ host, port, open: false, error: "timeout" });
      });
      socket.on("error", (error) => resolve({ host, port, open: false, error: error.code || error.message }));
    });
  }

  async #command(command, args = []) {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { timeout: 5000, windowsHide: true });
      return { available: true, output: (stdout || stderr).trim().split(/\r?\n/)[0] || "available" };
    } catch (error) {
      return { available: false, error: error.code === "ENOENT" ? "not_found" : error.message };
    }
  }

  async #attempt(name, command, args) {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { timeout: 60000, windowsHide: true, cwd: join(__dirname, "..", "..", "..", "..") });
      return { name, status: "ok", output: (stdout || stderr).trim() };
    } catch (error) {
      return { name, status: "failed", error: error.message };
    }
  }

  #status(checks) {
    if (checks.postgres.status === "ok" && checks.redis.status === "ok" && checks.persistence.status === "ok") return "ready";
    if (checks.postgres.status === "down" || checks.redis.status === "down") return "infrastructure_blocked";
    return "degraded";
  }

  #score(checks) {
    const items = [
      checks.postgres.status === "ok",
      checks.redis.status === "ok",
      checks.postgresPort.open,
      checks.redisPort.open,
      checks.migrations.status === "available",
      checks.persistence.status === "ok",
      checks.websocket.status === "configured",
    ];
    return Math.round((items.filter(Boolean).length / items.length) * 100);
  }

  #recommendations(checks) {
    const recommendations = [];
    if (!checks.postgresPort.open) recommendations.push("Start PostgreSQL on localhost:5432 using docker compose or a local service.");
    if (!checks.redisPort.open) recommendations.push("Start Redis on localhost:6379 for BullMQ queues and distributed workers.");
    if (!checks.docker.available) recommendations.push("Install Docker Desktop or provide managed PostgreSQL/Redis URLs.");
    if (checks.persistence.status !== "ok") recommendations.push("Run migrations after PostgreSQL becomes reachable.");
    return recommendations;
  }

  #errorMessage(error) {
    if (error?.message) return error.message;
    if (Array.isArray(error?.errors) && error.errors.length) {
      return error.errors.map((item) => item.message || item.code).filter(Boolean).join("; ");
    }
    return String(error);
  }

  async #event(type, payload) {
    await this.eventBus?.publish?.({
      workspaceId: this.workspaceId,
      channel: "infrastructure",
      type,
      payload,
    });
  }
}
