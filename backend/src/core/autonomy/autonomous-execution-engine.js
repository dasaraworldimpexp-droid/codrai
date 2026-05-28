import { EVENT_TYPES } from "../events/event-types.js";

export class AutonomousExecutionEngine {
  constructor({ planningEngine, multiAgentRuntime, memoryOrchestrator, emotionalIntelligenceEngine, eventBus }) {
    this.planningEngine = planningEngine;
    this.multiAgentRuntime = multiAgentRuntime;
    this.memoryOrchestrator = memoryOrchestrator;
    this.emotionalIntelligenceEngine = emotionalIntelligenceEngine;
    this.eventBus = eventBus;
  }

  async execute(goal) {
    const emotionalContext = await this.emotionalIntelligenceEngine.analyze({
      text: goal.objective,
      userId: goal.userId,
      workspaceId: goal.workspaceId,
      conversationId: goal.conversationId,
    });

    const memoryContext = await this.memoryOrchestrator.retrieveForAutonomousGoal(goal);

    await this.eventBus.publish({
      type: EVENT_TYPES.AGENT_RUN_STARTED,
      channel: `workspace:${goal.workspaceId}`,
      workspaceId: goal.workspaceId,
      projectId: goal.projectId,
      actorId: goal.userId,
      payload: { objective: goal.objective, phase: "planning" },
    });

    const plan = await this.planningEngine.createPlan({
      run: goal,
      objective: goal.objective,
      memoryContext,
      emotionalContext,
    });

    const result = await this.multiAgentRuntime.run({
      ...goal,
      objective: goal.objective,
      plan,
      emotionalContext,
      memoryContext,
    });

    await this.memoryOrchestrator.captureOutcome({
      goal,
      plan,
      result,
      emotionalContext,
    });

    return {
      goalId: goal.id,
      plan,
      result,
    };
  }
}
