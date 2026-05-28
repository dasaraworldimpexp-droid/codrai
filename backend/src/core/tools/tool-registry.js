export class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(manifest, handler) {
    if (!manifest?.name || !handler?.execute) {
      throw new Error("Tool registration requires manifest.name and handler.execute.");
    }

    this.tools.set(manifest.name, { manifest, handler });
  }

  get(name) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool is not registered: ${name}`);
    }
    return tool;
  }

  list() {
    return [...this.tools.values()].map(({ manifest }) => manifest);
  }
}
