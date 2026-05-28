export class ExecutionAnalyticsService {
  constructor({ analyticsRepository }) {
    this.analyticsRepository = analyticsRepository;
  }

  async recordExecution(event) {
    return this.analyticsRepository?.append?.({
      ...event,
      createdAt: event.createdAt || new Date().toISOString(),
    });
  }

  async dashboard({ workspaceId, from, to }) {
    return this.analyticsRepository?.aggregate?.({ workspaceId, from, to }) || {
      workspaceId,
      totals: { executions: 0, failures: 0, cost: 0, latencyMs: 0 },
      byProvider: [],
      byAgent: [],
      byWorkflow: [],
    };
  }
}
