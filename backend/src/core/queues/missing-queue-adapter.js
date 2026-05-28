export class MissingQueueAdapter {
  async enqueueAiTask() {
    throw new Error("Async execution requires Redis/BullMQ. Set REDIS_URL.");
  }

  async enqueue() {
    throw new Error("Background execution requires Redis/BullMQ. Set REDIS_URL.");
  }
}
