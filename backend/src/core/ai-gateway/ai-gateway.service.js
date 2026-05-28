export class AiGatewayService {
  constructor({
    modelRouter,
    promptOrchestrator,
    memoryService,
    usageService,
    jobQueue,
    conversationService,
  }) {
    this.modelRouter = modelRouter;
    this.promptOrchestrator = promptOrchestrator;
    this.memoryService = memoryService;
    this.usageService = usageService;
    this.jobQueue = jobQueue;
    this.conversationService = conversationService;
  }

  async execute(task) {
    await this.usageService.assertCanExecute(task);

    const memoryContext = await this.memoryService.retrieveForTask(task);
    const orchestratedTask = await this.promptOrchestrator.compose({
      task,
      memoryContext,
    });

    const route = await this.modelRouter.route(orchestratedTask);

    if (route.executionMode === "queue") {
      return this.jobQueue.enqueueAiTask({ task: orchestratedTask, route });
    }

    const reservation = await this.usageService.reserve(orchestratedTask);

    try {
      const result = await route.provider.execute(orchestratedTask);
      await this.usageService.finalize({ reservation, result });
      await this.conversationService.persistAiResult({ task: orchestratedTask, result });
      return result;
    } catch (error) {
      await this.usageService.releaseReservation(reservation);
      throw error;
    }
  }
}
