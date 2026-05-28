import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import net from "node:net";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class InfrastructureActivationService {
  constructor({ pool, redis, eventBus, infrastructureSupervisor }) {
    this.pool = pool;
    this.redis = redis;
    this.eventBus = eventBus;
    this.infrastructureSupervisor = infrastructureSupervisor;
  }

  async status({ workspaceId }) {
    const [capabilities, diagnostics, events] = await Promise.all([
      this.detectCapabilities(),
      this.infrastructureSupervisor.diagnostics(),
      this.#safeQuery("select * from infrastructure_activation_events where workspace_id = $1 order by created_at desc limit 30", [workspaceId]),
    ]);
    return {
      status: diagnostics.status,
      capabilities,
      diagnostics,
      events,
      activationMode: this.#activationMode(capabilities),
      endpoints: {
        activate: "/api/infrastructure/activate",
        status: "/api/infrastructure/status",
        recover: "/api/infrastructure/recover",
        workers: "/api/runtime/workers",
        containers: "/api/runtime/containers",
        queues: "/api/runtime/queues",
        failover: "/api/runtime/failover",
      },
    };
  }

  async activate({ workspaceId, userId, target = "all", runMigrations = true }) {
    const before = await this.status({ workspaceId });
    const actions = [];

    if (!before.capabilities.docker.available) {
      actions.push({
        name: "docker.compose.infrastructure",
        status: "blocked",
        reason: "Docker CLI is not available on PATH. Install Docker Desktop or provide managed PostgreSQL and Redis services.",
      });
    } else {
      const services = target === "postgres" ? ["postgres"] : target === "redis" ? ["redis"] : ["postgres", "redis"];
      actions.push(await this.#runCommand("docker", ["compose", "up", "-d", ...services], { timeout: 120000 }));
    }

    if (runMigrations) {
      const diagnostics = await this.infrastructureSupervisor.diagnostics();
      actions.push(diagnostics.checks?.postgres?.status === "ok"
        ? await this.#runMigrations()
        : { name: "postgres.migrations", status: "blocked", reason: "PostgreSQL is not reachable; migrations were not executed." });
    }

    const after = await this.status({ workspaceId });
    const status = after.diagnostics.status === "ready" ? "activated" : "blocked";
    await this.#record({ workspaceId, userId, action: `activate:${target}`, status, capabilitySnapshot: before.capabilities, result: { actions, before: before.diagnostics, after: after.diagnostics } });
    await this.#event({ workspaceId, type: "infrastructure.activation.completed", payload: { target, status, actions } });
    return { status, before: before.diagnostics, actions, after: after.diagnostics };
  }

  async recover({ workspaceId, userId, runMigrations = false }) {
    const before = await this.status({ workspaceId });
    const recovery = await this.infrastructureSupervisor.recover({ runMigrations });
    const after = await this.status({ workspaceId });
    const status = after.diagnostics.status === "ready" ? "recovered" : "blocked";
    await this.#record({ workspaceId, userId, action: "recover", status, capabilitySnapshot: before.capabilities, result: { recovery, after: after.diagnostics } });
    await this.#event({ workspaceId, type: "infrastructure.recovery.completed", payload: { status, actions: recovery.actions || [] } });
    return { status, before: before.diagnostics, recovery, after: after.diagnostics };
  }

  async detectCapabilities() {
    const [node, npm, docker, psql, redisServer, wsl, postgresPort, redisPort] = await Promise.all([
      this.#command("node", ["--version"]),
      this.#command("npm", ["--version"]),
      this.#command("docker", ["--version"]),
      this.#command("psql", ["--version"]),
      this.#command("redis-server", ["--version"]),
      this.#command("wsl", ["--status"]),
      this.#port("localhost", 5432),
      this.#port("localhost", 6379),
    ]);
    return {
      node,
      npm,
      docker,
      postgresCli: psql,
      redisServer,
      wsl,
      ports: { postgres: postgresPort, redis: redisPort },
      permissions: {
        canSpawnCommands: true,
        canInstallSystemServices: false,
        note: "System package installation or service installation requires elevated user approval outside the application runtime.",
      },
      checkedAt: new Date().toISOString(),
    };
  }

  async #runMigrations() {
    try {
      await this.infrastructureSupervisor.recover({ runMigrations: true });
      return { name: "postgres.migrations", status: "ok" };
    } catch (error) {
      return { name: "postgres.migrations", status: "blocked", error: this.#errorMessage(error) };
    }
  }

  #activationMode(capabilities) {
    if (capabilities.docker.available) return "docker_compose";
    if (capabilities.ports.postgres.open && capabilities.ports.redis.open) return "external_services";
    return "blocked_manual_dependency";
  }

  async #record({ workspaceId, userId, action, status, capabilitySnapshot, result }) {
    await this.#persist(
      `insert into infrastructure_activation_events
       (id, workspace_id, action, status, capability_snapshot, result, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [randomUUID(), workspaceId, action, status, capabilitySnapshot, result, userId || null]
    );
  }

  async #safeQuery(sql, params = []) {
    if (!this.pool) return [];
    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch {
      return [];
    }
  }

  async #persist(sql, params) {
    if (!this.pool) return { status: "blocked", error: "DATABASE_URL is not configured." };
    try {
      await this.pool.query(sql, params);
      return { status: "ok" };
    } catch (error) {
      await this.#event({ workspaceId: params?.[1], type: "infrastructure.persistence.blocked", payload: { error: this.#errorMessage(error) } });
      return { status: "blocked", error: this.#errorMessage(error) };
    }
  }

  async #command(command, args = []) {
    try {
      const startedAt = Date.now();
      const { stdout, stderr } = await execFileAsync(command, args, { timeout: 8000, windowsHide: true, shell: process.platform === "win32" });
      return { available: true, output: (stdout || stderr).trim().split(/\r?\n/)[0] || "available", latencyMs: Date.now() - startedAt };
    } catch (error) {
      const message = this.#errorMessage(error);
      const notFound = error.code === "ENOENT" || message.includes("not recognized") || message.includes("Could not find files");
      return { available: false, error: notFound ? "not_found" : message };
    }
  }

  async #runCommand(command, args, options = {}) {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { timeout: options.timeout || 60000, windowsHide: true, cwd: process.cwd().replace(/\\backend$/, "") });
      return { name: `${command} ${args.join(" ")}`, status: "ok", output: (stdout || stderr).trim() };
    } catch (error) {
      return { name: `${command} ${args.join(" ")}`, status: "failed", error: this.#errorMessage(error) };
    }
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

  async #event({ workspaceId, type, payload }) {
    await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type, payload });
  }

  #errorMessage(error) {
    if (error?.message) return error.message;
    if (Array.isArray(error?.errors) && error.errors.length) return error.errors.map((item) => item.message || item.code).filter(Boolean).join("; ");
    return String(error);
  }
}
