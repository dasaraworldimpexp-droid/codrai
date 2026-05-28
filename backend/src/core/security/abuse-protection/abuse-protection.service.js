export class AbuseProtectionService {
  constructor({ rateLimiter, auditLogger }) {
    this.rateLimiter = rateLimiter;
    this.auditLogger = auditLogger;
  }

  async assertAllowed({ key, limit, windowMs, metadata }) {
    const result = await this.rateLimiter.consume({ key, limit, windowMs });
    if (!result.allowed) {
      await this.auditLogger?.record?.({ action: "abuse.rate_limited", metadata });
      throw new Error("Rate limit exceeded.");
    }
    return result;
  }
}
