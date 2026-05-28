import { randomUUID } from "node:crypto";

export class AiEmployeeService {
  constructor({ pool, orchestratorService, eventBus }) {
    this.pool = pool;
    this.orchestratorService = orchestratorService;
    this.eventBus = eventBus;
  }

  async create({ workspaceId, projectId, userId, name, role, personality = {}, goals = [], toolPermissions = [] }) {
    if (!this.pool) throw new Error("AI employees require PostgreSQL DATABASE_URL.");
    if (!workspaceId || !name || !role) throw new Error("workspaceId, name, and role are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into ai_employees
       (id, workspace_id, project_id, name, role, personality, goals, tool_permissions, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())`,
      [id, workspaceId, projectId || null, name, role, personality, goals, toolPermissions, userId || null]
    );
    await this.#publish({ workspaceId, projectId, userId, type: "employee.created", payload: { employeeId: id, name, role } });
    return this.get({ workspaceId, id });
  }

  async list({ workspaceId, limit = 50 }) {
    const result = await this.pool.query(
      "select * from ai_employees where workspace_id = $1 order by created_at desc limit $2",
      [workspaceId, limit]
    );
    return result.rows;
  }

  async get({ workspaceId, id }) {
    const result = await this.pool.query("select * from ai_employees where id = $1 and workspace_id = $2", [id, workspaceId]);
    if (!result.rows[0]) throw new Error("AI employee not found.");
    return result.rows[0];
  }

  async assign({ workspaceId, projectId, userId, id, objective }) {
    const employee = await this.get({ workspaceId, id });
    const run = await this.orchestratorService.start({
      workspaceId,
      projectId: projectId || employee.project_id,
      userId,
      objective: [
        `AI employee: ${employee.name}`,
        `Role: ${employee.role}`,
        `Personality: ${JSON.stringify(employee.personality)}`,
        `Goals: ${JSON.stringify(employee.goals)}`,
        `Task: ${objective}`,
      ].join("\n"),
    });
    await this.#publish({ workspaceId, projectId, userId, type: "employee.assigned", payload: { employeeId: id, runId: run.run?.id } });
    return { employee, run };
  }

  #publish({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
