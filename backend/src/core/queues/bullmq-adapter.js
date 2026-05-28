import { Queue } from "bullmq";

export class BullMqQueueAdapter {
  constructor({ connection }) {
    if (!connection) {
      throw new Error("BullMqQueueAdapter requires a Redis connection.");
    }

    this.connection = connection;
    this.queues = new Map();
  }

  async add(queueName, payload, options = {}) {
    const queue = this.#queue(queueName);
    return queue.add(payload.idempotencyKey || "job", payload, {
      jobId: payload.idempotencyKey,
      attempts: options.attempts || 3,
      backoff: options.backoff || { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      ...options,
    });
  }

  #queue(queueName) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, new Queue(queueName, { connection: this.connection }));
    }
    return this.queues.get(queueName);
  }
}
