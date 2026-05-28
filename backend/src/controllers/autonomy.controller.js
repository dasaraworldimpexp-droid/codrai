import { randomUUID } from "node:crypto";

export async function startAutonomousGoal(req, res, next) {
  try {
    const autonomousExecutionEngine = req.app.locals.autonomousExecutionEngine;

    if (!autonomousExecutionEngine) {
      return res.status(503).json({ message: "Autonomous execution engine is not configured." });
    }

    const result = await autonomousExecutionEngine.execute({
      ...req.body,
      userId: req.user?.id || req.body.userId,
      workspaceId: req.workspace?.id || req.body.workspaceId,
      id: req.body.id || randomUUID(),
    });

    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
