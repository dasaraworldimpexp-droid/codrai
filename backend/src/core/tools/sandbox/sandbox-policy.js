export class SandboxPolicy {
  constructor({
    timeoutMs = 120000,
    allowNetwork = false,
    allowShell = false,
    allowFileWrite = false,
    maxOutputBytes = 5_000_000,
  } = {}) {
    this.timeoutMs = timeoutMs;
    this.allowNetwork = allowNetwork;
    this.allowShell = allowShell;
    this.allowFileWrite = allowFileWrite;
    this.maxOutputBytes = maxOutputBytes;
  }

  assertAllowed(toolManifest) {
    const capabilities = toolManifest.capabilities || [];

    if (!this.allowNetwork && capabilities.includes("network")) {
      throw new Error(`Tool ${toolManifest.name} requires network but sandbox policy denies it.`);
    }

    if (!this.allowShell && capabilities.includes("shell")) {
      throw new Error(`Tool ${toolManifest.name} requires shell but sandbox policy denies it.`);
    }

    if (!this.allowFileWrite && capabilities.includes("file_write")) {
      throw new Error(`Tool ${toolManifest.name} requires file write but sandbox policy denies it.`);
    }
  }
}
