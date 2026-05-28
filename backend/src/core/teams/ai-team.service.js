import { randomUUID } from "node:crypto";

export class AiTeamService {
  constructor({ pool, eventBus }) {
    this.pool = pool;
    this.eventBus = eventBus;
  }

  async create({ workspaceId, projectId, userId, name, mission, members = [] }) {
    if (!this.pool) throw new Error("AI teams require PostgreSQL DATABASE_URL.");
    if (!workspaceId || !name || !mission) throw new Error("workspaceId, name, and mission are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into ai_teams (id, workspace_id, project_id, name, mission, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, now(), now())`,
      [id, workspaceId, projectId || null, name, mission, userId || null]
    );
    for (const member of members) {
      await this.pool.query(
        `insert into ai_team_members (id, team_id, workspace_id, employee_id, role, hierarchy_rank, created_at)
         values ($1, $2, $3, $4, $5, $6, now())`,
        [randomUUID(), id, workspaceId, member.employeeId || null, member.role, Number(member.hierarchyRank || 50)]
      );
    }
    await this.#event({ workspaceId, projectId, userId, type: "ai_team.created", payload: { teamId: id, name } });
    return this.get({ workspaceId, id });
  }

  async list({ workspaceId, limit = 20 }) {
    const result = await this.pool.query("select * from ai_teams where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async get({ workspaceId, id }) {
    const team = await this.pool.query("select * from ai_teams where id = $1 and workspace_id = $2", [id, workspaceId]);
    if (!team.rows[0]) throw new Error("AI team not found.");
    const members = await this.pool.query(
      `select m.*, e.name as employee_name
       from ai_team_members m
       left join ai_employees e on e.id = m.employee_id
       where m.team_id = $1
       order by m.hierarchy_rank asc`,
      [id]
    );
    return { ...team.rows[0], members: members.rows };
  }

  async message({ workspaceId, projectId, userId, teamId, fromAgent, toAgent, content }) {
    await this.pool.query(
      `insert into agent_messages (id, workspace_id, project_id, run_id, from_agent, to_agent, type, content, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, 'team_message', $7, $8, now())`,
      [randomUUID(), workspaceId, projectId || null, teamId, fromAgent, toAgent || null, content, { teamId }]
    );
    await this.#event({ workspaceId, projectId, userId, type: "ai_team.message", payload: { teamId, fromAgent, toAgent, content } });
    return { status: "sent" };
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
