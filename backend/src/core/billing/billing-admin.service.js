import { randomUUID } from "node:crypto";

export class BillingAdminService {
  constructor({ pool }) {
    this.pool = pool;
  }

  async generateUsageInvoice({ workspaceId, periodStart, periodEnd }) {
    if (!this.pool) throw new Error("Billing admin requires PostgreSQL DATABASE_URL.");
    const start = periodStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const end = periodEnd || new Date().toISOString();
    const [usage, meters, tools, jobs] = await Promise.all([
      this.pool.query(
        `select provider, model, count(*)::int as requests,
                coalesce(sum((usage->>'total_tokens')::bigint), 0)::bigint as tokens
         from usage_ledger
         where workspace_id = $1 and created_at between $2 and $3
         group by provider, model`,
        [workspaceId, start, end]
      ),
      this.pool.query(
        `select meter_type, unit, coalesce(sum(quantity), 0)::numeric as quantity
         from usage_billing_meters
         where workspace_id = $1 and created_at between $2 and $3
         group by meter_type, unit
         order by meter_type`,
        [workspaceId, start, end]
      ).catch(() => ({ rows: [] })),
      this.pool.query(
        `select tool_name, count(*)::int as executions
         from tool_executions
         where workspace_id = $1 and created_at between $2 and $3
         group by tool_name`,
        [workspaceId, start, end]
      ),
      this.pool.query(
        `select kind, count(*)::int as jobs
         from jobs
         where workspace_id = $1 and created_at between $2 and $3
         group by kind`,
        [workspaceId, start, end]
      ),
    ]);
    const lineItems = [
      ...usage.rows.map((row) => ({ type: "model_tokens", ...row, amount: Number(row.tokens || 0) * 0.000002 })),
      ...meters.rows.map((row) => ({
        type: "usage_meter",
        meterType: row.meter_type,
        unit: row.unit,
        quantity: Number(row.quantity || 0),
        amount: row.meter_type === "ai_credits" ? Number(row.quantity || 0) : 0,
      })),
      ...tools.rows.map((row) => ({ type: "tool_execution", ...row, amount: Number(row.executions || 0) * 0.001 })),
      ...jobs.rows.map((row) => ({ type: "background_job", ...row, amount: Number(row.jobs || 0) * 0.002 })),
    ];
    const subtotal = Number(lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(4));
    const gstRate = Number(process.env.BILLING_GST_RATE || 0);
    const taxAmount = Number((subtotal * gstRate).toFixed(4));
    const totals = {
      amount: subtotal,
      subtotal,
      taxRate: gstRate,
      taxAmount,
      totalAmount: Number((subtotal + taxAmount).toFixed(4)),
      currency: process.env.BILLING_CURRENCY || "USD",
      gstin: process.env.BILLING_GSTIN || null,
      requests: usage.rows.reduce((sum, item) => sum + Number(item.requests || 0), 0),
      tokens: usage.rows.reduce((sum, item) => sum + Number(item.tokens || 0), 0),
      toolExecutions: tools.rows.reduce((sum, item) => sum + Number(item.executions || 0), 0),
      jobs: jobs.rows.reduce((sum, item) => sum + Number(item.jobs || 0), 0),
      meters: meters.rows.reduce((sum, item) => ({ ...sum, [item.meter_type]: Number(item.quantity || 0) }), {}),
    };
    const id = randomUUID();
    await this.pool.query(
      `insert into billing_usage_invoices (id, workspace_id, period_start, period_end, status, totals, line_items, created_at)
       values ($1, $2, $3, $4, 'draft', $5, $6, now())`,
      [id, workspaceId, start, end, JSON.stringify(totals), JSON.stringify(lineItems)]
    );
    return this.getInvoice({ workspaceId, id });
  }

  async listInvoices({ workspaceId, limit = 20 }) {
    const result = await this.pool.query("select * from billing_usage_invoices where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async getInvoice({ workspaceId, id }) {
    const result = await this.pool.query("select * from billing_usage_invoices where id = $1 and workspace_id = $2", [id, workspaceId]);
    if (!result.rows[0]) throw new Error("Usage invoice not found.");
    return result.rows[0];
  }
}
