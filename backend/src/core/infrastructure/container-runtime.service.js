import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class ContainerRuntimeService {
  constructor({ infrastructureActivationService, eventBus }) {
    this.infrastructureActivationService = infrastructureActivationService;
    this.eventBus = eventBus;
  }

  async status({ workspaceId }) {
    const capabilities = await this.infrastructureActivationService.detectCapabilities();
    if (!capabilities.docker.available) {
      return {
        status: "blocked",
        runtime: "docker",
        containers: [],
        capabilities,
        reason: "Docker CLI is not available on PATH.",
      };
    }
    const ps = await this.#command("docker", ["ps", "--format", "{{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}|{{.Ports}}"]);
    const compose = await this.#command("docker", ["compose", "ps", "--format", "json"]);
    const status = ps.status === "ok" ? "ready" : "blocked";
    await this.#event({ workspaceId, type: "runtime.containers.status", payload: { status, count: this.#parsePs(ps.output).length } });
    return {
      status,
      runtime: "docker",
      containers: ps.status === "ok" ? this.#parsePs(ps.output) : [],
      compose: compose.status === "ok" ? this.#parseCompose(compose.output) : [],
      capabilities,
      error: ps.error,
    };
  }

  async lifecycle({ workspaceId, serviceName = "infrastructure", action = "status" }) {
    const capabilities = await this.infrastructureActivationService.detectCapabilities();
    if (!capabilities.docker.available) {
      return { status: "blocked", action, serviceName, reason: "Docker CLI is not available on PATH.", capabilities };
    }
    if (action === "status") return this.status({ workspaceId });
    const allowed = new Set(["start", "stop", "restart"]);
    if (!allowed.has(action)) throw new Error(`Unsupported container lifecycle action: ${action}`);
    const services = serviceName === "infrastructure" ? ["postgres", "redis"] : [serviceName];
    const args = action === "start" ? ["compose", "up", "-d", ...services] : action === "stop" ? ["compose", "stop", ...services] : ["compose", "restart", ...services];
    const result = await this.#command("docker", args, { timeout: 120000 });
    await this.#event({ workspaceId, type: "runtime.containers.lifecycle", payload: { action, serviceName, status: result.status } });
    return { action, serviceName, ...result, after: await this.status({ workspaceId }) };
  }

  async #command(command, args, options = {}) {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { timeout: options.timeout || 15000, windowsHide: true, cwd: process.cwd().replace(/\\backend$/, "") });
      return { status: "ok", output: (stdout || stderr).trim() };
    } catch (error) {
      return { status: "failed", error: error.message };
    }
  }

  #parsePs(output = "") {
    return output.split(/\r?\n/).filter(Boolean).map((line) => {
      const [id, image, name, status, ports] = line.split("|");
      return { id, image, name, status, ports };
    });
  }

  #parseCompose(output = "") {
    return output.split(/\r?\n/).filter(Boolean).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
  }

  async #event({ workspaceId, type, payload }) {
    await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type, payload });
  }
}
