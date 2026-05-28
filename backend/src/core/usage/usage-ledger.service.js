import { randomUUID } from "node:crypto";

export class UsageLedgerService {
  constructor({ pool }) {
    this.pool = pool;
  }

  async assertCanExecute(task) {
    if (!task.workspaceId) {
      throw new Error("AI execution requires workspaceId.");
    }
    if (!this.pool) return true;
    const quota = await this.pool.query("select * from developer_api_quota_state where workspace_id = $1", [task.workspaceId]).catch(() => ({ rows: [] }));
    const state = quota.rows[0];
    if (!state?.hard_limit_enabled) return true;
    const usage = await this.pool.query(
      `select count(*)::int as requests,
              coalesce(sum((usage->>'total_tokens')::bigint), 0)::bigint as tokens
       from usage_ledger
       where workspace_id = $1 and created_at >= date_trunc('month', now())`,
      [task.workspaceId]
    );
    const requests = Number(usage.rows[0]?.requests || 0);
    const tokens = Number(usage.rows[0]?.tokens || 0);
    if (requests >= Number(state.monthly_request_limit || 0) || tokens >= Number(state.monthly_token_limit || 0)) {
      throw Object.assign(new Error("Workspace AI quota exceeded."), {
        statusCode: 402,
        code: "workspace_ai_quota_exceeded",
      });
    }
    return true;
  }

  async reserve(task) {
    const reservation = {
      id: randomUUID(),
      workspaceId: task.workspaceId,
      userId: task.userId,
      projectId: task.projectId,
      taskId: task.id,
      status: "reserved",
      createdAt: new Date().toISOString(),
    };

    if (this.pool) {
      await this.pool.query(
        `insert into credit_reservations (id, workspace_id, user_id, project_id, task_id, status, created_at)
         values ($1, $2, $3, $4, $5, $6, now())`,
        [reservation.id, reservation.workspaceId, reservation.userId || null, reservation.projectId || null, reservation.taskId, reservation.status]
      );
    }

    return reservation;
  }

  async finalize({ reservation, result }) {
    if (!this.pool) return { reservation, result };
    const usage = this.#usage(result);
    const creditCost = this.#creditCost({ result, usage });
    await this.pool.query(
      `insert into usage_ledger (id, workspace_id, user_id, project_id, task_id, provider, model, usage, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [randomUUID(), reservation.workspaceId, reservation.userId || null, reservation.projectId || null, reservation.taskId, result.provider || null, result.model || null, result.usage || null]
    );
    await this.pool.query(
      `insert into model_usage_events (id, workspace_id, user_id, project_id, provider, model, task_type, input_tokens, output_tokens, estimated_cost, latency_ms, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed', now())`,
      [
        randomUUID(),
        reservation.workspaceId,
        reservation.userId || null,
        reservation.projectId || null,
        result.provider || null,
        result.model || null,
        result.taskType || null,
        usage.inputTokens,
        usage.outputTokens,
        creditCost,
        result.latencyMs || null,
      ]
    );
    await this.#recordBillingMeters({ reservation, result, usage, creditCost });
    await this.pool.query("update credit_reservations set status = 'finalized', finalized_at = now() where id = $1", [reservation.id]);
    return { reservation, result };
  }

  async releaseReservation(reservation) {
    if (!this.pool) return reservation;
    await this.pool.query("update credit_reservations set status = 'released', finalized_at = now() where id = $1", [reservation.id]);
    return reservation;
  }

  #usage(result = {}) {
    const raw = result.usage || {};
    const inputTokens = Number(raw.prompt_tokens || raw.input_tokens || 0);
    const outputTokens = Number(raw.completion_tokens || raw.output_tokens || 0);
    return {
      inputTokens,
      outputTokens,
      totalTokens: Number(raw.total_tokens || inputTokens + outputTokens || 0),
    };
  }

  #creditCost({ result, usage }) {
    if (Number.isFinite(Number(result.estimatedCost))) return Number(result.estimatedCost);
    const creditsPerThousand = Number(process.env.AI_CREDITS_PER_1K_TOKENS || 0.01);
    return Number(((usage.totalTokens / 1000) * creditsPerThousand).toFixed(6));
  }

  async #recordBillingMeters({ reservation, result, usage, creditCost }) {
    const periodStart = "date_trunc('month', now())";
    const periodEnd = "date_trunc('month', now()) + interval '1 month'";
    const common = {
      provider: result.provider || null,
      model: result.model || null,
      taskId: reservation.taskId || null,
      taskType: result.taskType || null,
    };
    const meters = [
      ["ai_request", "request", 1],
      ["ai_input_tokens", "token", usage.inputTokens],
      ["ai_output_tokens", "token", usage.outputTokens],
      ["ai_total_tokens", "token", usage.totalTokens],
      ["ai_credits", "credit", creditCost],
    ].filter(([, , quantity]) => Number(quantity) > 0);

    for (const [meterType, unit, quantity] of meters) {
      await this.pool.query(
        `insert into usage_billing_meters (id, workspace_id, meter_type, unit, quantity, period_start, period_end, metadata, created_at)
         values ($1, $2, $3, $4, $5, ${periodStart}, ${periodEnd}, $6, now())`,
        [randomUUID(), reservation.workspaceId, meterType, unit, quantity, common]
      ).catch(() => null);
    }

    if (creditCost > 0) {
      await this.pool.query(
        `insert into credit_wallets (workspace_id, balance, updated_at)
         values ($1, $2 * -1, now())
         on conflict (workspace_id) do update set balance = credit_wallets.balance - $2, updated_at = now()`,
        [reservation.workspaceId, creditCost]
      ).catch(() => null);
    }
  }
}
