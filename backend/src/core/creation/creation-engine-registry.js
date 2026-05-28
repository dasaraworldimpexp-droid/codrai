export class CreationEngineRegistry {
  constructor() {
    this.engines = new Map();
  }

  register(engine) {
    if (!engine?.type || !engine?.createWorkflow) {
      throw new Error("Creation engine requires type and createWorkflow.");
    }

    this.engines.set(engine.type, engine);
  }

  get(type) {
    const engine = this.engines.get(type);
    if (!engine) {
      throw new Error(`Creation engine is not registered: ${type}`);
    }
    return engine;
  }

  list() {
    return [...this.engines.values()].map((engine) => engine.manifest());
  }
}
