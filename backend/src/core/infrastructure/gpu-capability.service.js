import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = Number(process.env.GPU_PROBE_TIMEOUT_MS || 3000);

async function run(command, args = []) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: COMMAND_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 256,
    });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      error: error.code === "ENOENT" ? `${command} is not installed or not on PATH.` : error.message,
      code: error.code || "GPU_PROBE_FAILED",
    };
  }
}

function parseGpuRows(output) {
  if (!output) return [];
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, driverVersion, memoryTotal, memoryUsed, utilizationGpu] = line.split(",").map((item) => item.trim());
      return {
        id: `gpu-${index}`,
        name,
        driverVersion,
        memoryTotalMiB: Number(memoryTotal || 0),
        memoryUsedMiB: Number(memoryUsed || 0),
        utilizationGpuPercent: Number(utilizationGpu || 0),
      };
    });
}

async function fileStatus(path) {
  try {
    await access(path);
    return { status: "available", path };
  } catch (error) {
    return { status: "blocked", path, reason: error.code || error.message };
  }
}

async function readFirstLine(path) {
  try {
    const text = await readFile(path, "utf8");
    return text.split(/\r?\n/).find(Boolean) || "";
  } catch {
    return "";
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.GPU_OLLAMA_PROBE_TIMEOUT_MS || 2000));
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return { ok: false, status: response.status, error: await response.text().catch(() => response.statusText) };
    return { ok: true, data: await response.json() };
  } catch (error) {
    return { ok: false, error: error.name === "AbortError" ? "request timed out" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

export class GpuCapabilityService {
  constructor({ eventBus } = {}) {
    this.eventBus = eventBus;
  }

  async status({ workspaceId } = {}) {
    const startedAt = Date.now();
    const cpuFirst = process.env.CODRAI_CPU_FIRST_MODE !== "false";
    if (cpuFirst) {
      const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/v1$/, "").replace(/\/$/, "");
      const ollamaPs = await fetchJson(`${ollamaBaseUrl}/api/ps`);
      const result = {
        status: "disabled",
        mode: "cpu_first_intel_uhd",
        generatedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        vendor: "intel_uhd_or_cpu_only",
        devices: [],
        dockerPassthrough: {
          status: "disabled",
          reason: "CODRAI is running in permanent CPU-first mode for Intel UHD-only hardware.",
        },
        cuda: {
          status: "disabled",
          detail: "CUDA/NVIDIA probing is disabled by CODRAI_CPU_FIRST_MODE.",
        },
        nvidiaSmi: {
          status: "disabled",
          detail: "NVIDIA probing skipped. This runtime is intentionally CPU-first.",
        },
        cpu: this.#cpuSnapshot(),
        memory: this.#memorySnapshot(),
        ollama: {
          baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
          gpuBaseUrl: null,
          gpuAwareness: "disabled_cpu_first",
          cpuFallback: true,
          activeModels: ollamaPs.ok ? (ollamaPs.data?.models || []).map((model) => ({
            name: model.name,
            size: model.size || null,
            sizeVram: model.size_vram || null,
            expiresAt: model.expires_at || null,
          })) : [],
          telemetryStatus: ollamaPs.ok ? "available" : "blocked",
          telemetryReason: ollamaPs.ok ? null : ollamaPs.error,
          recommendedEnv: {
            OLLAMA_MAX_LOADED_MODELS: process.env.OLLAMA_MAX_LOADED_MODELS || "1",
            OLLAMA_NUM_PARALLEL: process.env.OLLAMA_NUM_PARALLEL || "1",
            OLLAMA_KEEP_ALIVE: process.env.OLLAMA_KEEP_ALIVE || "5m",
          },
        },
        resources: {
          processMemory: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          uptimeSeconds: Math.round(process.uptime()),
        },
        safety: {
          forcedGpu: false,
          fallback: "GPU acceleration is intentionally disabled. CPU-first mode is the production path for this machine.",
        },
      };
      await this.eventBus?.publish?.({
        workspaceId,
        channel: workspaceId ? `workspace:${workspaceId}` : "runtime:cpu",
        type: "runtime.cpu.telemetry",
        payload: {
          status: result.status,
          loadAverage: result.cpu.loadAverage,
          memoryUsedPercent: result.memory.usedPercent,
        },
      });
      return result;
    }

    const gpuProbe = await run("nvidia-smi", [
      "--query-gpu=name,driver_version,memory.total,memory.used,utilization.gpu",
      "--format=csv,noheader,nounits",
    ]);
    const cudaProbe = await run("nvcc", ["--version"]);
    const [nvidiaDevice, nvidiaProc] = await Promise.all([
      fileStatus("/dev/nvidiactl"),
      fileStatus("/proc/driver/nvidia/version"),
    ]);

    const devices = gpuProbe.ok ? parseGpuRows(gpuProbe.stdout) : [];
    const ollamaBaseUrl = (process.env.OLLAMA_GPU_BASE_URL || process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/v1$/, "").replace(/\/$/, "");
    const ollamaPs = await fetchJson(`${ollamaBaseUrl}/api/ps`);
    const status = devices.length > 0 ? "available" : "blocked";
    const result = {
      status,
      mode: status === "available" ? "gpu_capable" : "cpu_fallback",
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      vendor: devices.length > 0 ? "nvidia" : null,
      devices,
      dockerPassthrough: {
        status: nvidiaDevice.status === "available" || nvidiaProc.status === "available" ? "available" : "blocked",
        device: nvidiaDevice,
        driverProc: nvidiaProc,
        driverVersion: await readFirstLine("/proc/driver/nvidia/version"),
        nvidiaVisibleDevices: process.env.NVIDIA_VISIBLE_DEVICES || null,
        nvidiaDriverCapabilities: process.env.NVIDIA_DRIVER_CAPABILITIES || null,
      },
      cuda: {
        status: cudaProbe.ok ? "available" : "blocked",
        detail: cudaProbe.ok ? cudaProbe.stdout.split(/\r?\n/).slice(0, 2).join(" ") : cudaProbe.error,
      },
      nvidiaSmi: {
        status: gpuProbe.ok ? "available" : "blocked",
        detail: gpuProbe.ok ? "nvidia-smi responded" : gpuProbe.error,
      },
      ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        gpuBaseUrl: process.env.OLLAMA_GPU_BASE_URL || null,
        gpuAwareness: process.env.OLLAMA_NUM_GPU ? `OLLAMA_NUM_GPU=${process.env.OLLAMA_NUM_GPU}` : "auto_or_cpu",
        cpuFallback: true,
        activeModels: ollamaPs.ok ? (ollamaPs.data?.models || []).map((model) => ({
          name: model.name,
          size: model.size || null,
          sizeVram: model.size_vram || null,
          expiresAt: model.expires_at || null,
        })) : [],
        telemetryStatus: ollamaPs.ok ? "available" : "blocked",
        telemetryReason: ollamaPs.ok ? null : ollamaPs.error,
      },
      resources: {
        processMemory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptimeSeconds: Math.round(process.uptime()),
      },
      safety: {
        forcedGpu: false,
        fallback: "CPU-first mode remains active when GPU probes fail.",
      },
    };

    await this.eventBus?.publish?.({
      workspaceId,
      channel: workspaceId ? `workspace:${workspaceId}` : "runtime:gpu",
      type: "runtime.gpu.telemetry",
      payload: {
        status: result.status,
        devices: result.devices.length,
        cuda: result.cuda.status,
      },
    });

    return result;
  }

  #cpuSnapshot() {
    const cpus = os.cpus() || [];
    return {
      status: "available",
      model: cpus[0]?.model || "unknown",
      cores: cpus.length,
      loadAverage: os.loadavg(),
      platform: os.platform(),
      arch: os.arch(),
    };
  }

  #memorySnapshot() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = Math.max(total - free, 0);
    return {
      totalBytes: total,
      freeBytes: free,
      usedBytes: used,
      usedPercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
    };
  }
}
