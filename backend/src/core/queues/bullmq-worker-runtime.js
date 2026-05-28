import { Worker } from "bullmq";

export class BullMqWorkerRuntime {
  constructor({ connection, handlers, eventBus, jobRepository }) {
    if (!connection) {
      throw new Error("BullMqWorkerRuntime requires a Redis connection.");
    }

    this.connection = connection;
    this.handlers = handlers;
    this.eventBus = eventBus;
    this.jobRepository = jobRepository;
    this.workers = [];
  }

  start(queueNames) {
    this.workers = queueNames.map((queueName) => new Worker(queueName, async (job) => {
      const handler = this.handlers.get(queueName);
      if (!handler) {
        throw new Error(`No worker handler registered for queue: ${queueName}`);
      }

      await this.jobRepository?.updateStatus?.(job.data.jobId, "running");
      await this.#publish("queue.job.running", queueName, job);
      const result = await handler(job.data.payload, {
        reportProgress: (progress) => job.updateProgress(progress),
      });
      await this.jobRepository?.complete?.(job.data.jobId, result);
      await this.#publish("queue.job.completed", queueName, job, { resultType: typeof result });
      return result;
    }, {
      connection: this.connection,
      concurrency: Number(process.env.WORKER_CONCURRENCY || 1),
      lockDuration: Number(process.env.WORKER_LOCK_DURATION_MS || 30000),
      stalledInterval: Number(process.env.WORKER_STALLED_INTERVAL_MS || 30000),
      maxStalledCount: Number(process.env.WORKER_MAX_STALLED_COUNT || 1),
    }));

    for (const worker of this.workers) {
      worker.on("failed", (job, error) => {
        this.jobRepository?.fail?.(job?.data?.jobId, {
          message: error?.message || "job failed",
          queueName: worker.name,
          attemptsMade: job?.attemptsMade || 0,
          failedAt: new Date().toISOString(),
        }).catch(() => {});
        this.#publish("queue.job.failed", worker.name, job, { error: error?.message || "job failed" }).catch(() => {});
      });
      worker.on("stalled", (jobId) => {
        this.eventBus?.publish?.({
          type: "queue.job.stalled",
          channel: "runtime:queues",
          workspaceId: "system",
          payload: { queueName: worker.name, jobId, at: new Date().toISOString() },
        }).catch(() => {});
      });
    }

    return this.workers;
  }

  async stop() {
    await Promise.all(this.workers.map((worker) => worker.close()));
  }

  #publish(type, queueName, job, payload = {}) {
    return this.eventBus?.publish?.({
      type,
      channel: "runtime:queues",
      workspaceId: job?.data?.payload?.workspaceId || job?.data?.workspaceId || "system",
      projectId: job?.data?.payload?.projectId,
      payload: {
        queueName,
        jobId: job?.data?.jobId || job?.id,
        bullJobId: job?.id,
        attemptsMade: job?.attemptsMade || 0,
        ...payload,
      },
    });
  }
}
