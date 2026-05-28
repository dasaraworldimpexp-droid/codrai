export class HealthService {
  constructor({ pool, redis, providerHealthService }) {
    this.pool = pool;
    this.redis = redis;
    this.providerHealthService = providerHealthService;
  }

  async status() {
    const checks = {
      api: "ok",
      postgres: await this.#postgres(),
      redis: await this.#redis(),
      providers: this.providerHealthService?.snapshot?.() || {},
      checkedAt: new Date().toISOString(),
    };

    const ok = checks.postgres !== "down" && checks.redis !== "down";
    return { status: ok ? "ok" : "degraded", checks };
  }

  async #postgres() {
    if (!this.pool) return "not_configured";
    try {
      await this.pool.query("select 1");
      return "ok";
    } catch {
      return "down";
    }
  }

  async #redis() {
    if (!this.redis) return "not_configured";
    try {
      await this.redis.ping();
      return "ok";
    } catch {
      return "down";
    }
  }
}
