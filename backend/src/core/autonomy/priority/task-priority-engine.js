export class TaskPriorityEngine {
  score(task) {
    const deadlineScore = task.deadlineAt ? Math.max(0, 1 - ((new Date(task.deadlineAt) - Date.now()) / 86_400_000)) : 0.2;
    const businessImpact = task.businessImpact || 0.5;
    const userUrgency = task.urgency === "high" ? 1 : 0.4;
    const dependencyBoost = task.blocks?.length ? 0.2 : 0;

    const score = Math.max(0, Math.min(1, deadlineScore * 0.25 + businessImpact * 0.35 + userUrgency * 0.3 + dependencyBoost));
    return { taskId: task.id, score, priority: score > 0.75 ? "high" : score > 0.45 ? "medium" : "low" };
  }

  order(tasks) {
    return [...tasks].map((task) => ({ task, priority: this.score(task) })).sort((a, b) => b.priority.score - a.priority.score);
  }
}
