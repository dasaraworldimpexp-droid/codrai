export class TaskScheduler {
  constructor({ scheduleRepository, backgroundProcessor, clock = () => new Date() }) {
    this.scheduleRepository = scheduleRepository;
    this.backgroundProcessor = backgroundProcessor;
    this.clock = clock;
  }

  async tick() {
    const dueTasks = await this.scheduleRepository.findDue(this.clock());

    return Promise.all(
      dueTasks.map(async (scheduledTask) => {
        const lock = await this.scheduleRepository.acquireLock(scheduledTask.id);
        if (!lock.acquired) {
          return { scheduledTaskId: scheduledTask.id, skipped: true };
        }

        try {
          const job = await this.backgroundProcessor.enqueueScheduledTask(scheduledTask);
          await this.scheduleRepository.markDispatched(scheduledTask.id, job);
          return { scheduledTaskId: scheduledTask.id, job };
        } finally {
          await this.scheduleRepository.releaseLock(scheduledTask.id);
        }
      })
    );
  }
}
