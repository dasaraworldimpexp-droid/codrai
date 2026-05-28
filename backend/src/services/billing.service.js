import { createHmac, randomUUID } from "node:crypto";
import Razorpay from "razorpay";
import Stripe from "stripe";
import { env } from "../config/env.js";

export class BillingService {
  constructor({ pool }) {
    this.pool = pool;
    this.stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;
    this.razorpay = env.razorpayKeyId && env.razorpayKeySecret
      ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
      : null;
  }

  async createCheckoutSession({ workspaceId, userId, email, priceId = env.stripePricePremium }) {
    if (!this.stripe) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
    if (!priceId) throw new Error("Stripe price is not configured. Set STRIPE_PRICE_PREMIUM.");

    const customerId = await this.#getOrCreateCustomer({ workspaceId, email });
    return this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.publicAppUrl}/dashboard?billing=success`,
      cancel_url: `${env.publicAppUrl}/dashboard?billing=cancelled`,
      metadata: { workspaceId, userId: userId || "" },
    });
  }

  async plans() {
    if (!this.pool) throw new Error("Billing plans require PostgreSQL DATABASE_URL.");
    const result = await this.pool.query("select * from billing_plans where status = 'active' order by monthly_price_cents asc");
    return result.rows;
  }

  async createCheckoutForPlan({ workspaceId, userId, email, plan = "pro" }) {
    const priceId = {
      free: null,
      pro: env.stripePricePro || env.stripePricePremium,
      business: env.stripePriceBusiness,
      enterprise: env.stripePriceEnterprise,
    }[plan];

    if (plan === "free") {
      await this.pool?.query("update workspaces set plan = 'free' where id = $1", [workspaceId]);
      return { id: "free_plan", url: `${env.publicAppUrl}/developer/usage`, mode: "manual", plan: "free" };
    }

    return this.createCheckoutSession({ workspaceId, userId, email, priceId });
  }

  async status({ workspaceId }) {
    if (!this.pool) throw new Error("Billing status requires PostgreSQL DATABASE_URL.");
    const [plans, subscription, wallet, invoices, quota, usage, events, seats] = await Promise.all([
      this.plans(),
      this.pool.query("select * from subscriptions where workspace_id = $1 order by created_at desc limit 1", [workspaceId]),
      this.pool.query(
        `insert into credit_wallets (workspace_id, updated_at)
         values ($1, now())
         on conflict (workspace_id) do update set updated_at = credit_wallets.updated_at
         returning *`,
        [workspaceId]
      ),
      this.pool.query("select * from billing_usage_invoices where workspace_id = $1 order by created_at desc limit 10", [workspaceId]),
      this.quota({ workspaceId }).catch((error) => ({ error: error.message })),
      this.#usageMeters({ workspaceId }),
      this.pool.query("select provider, event_type, status, created_at from billing_events where workspace_id = $1 order by created_at desc limit 20", [workspaceId]).catch(() => ({ rows: [] })),
      this.pool.query("select * from subscription_seats where workspace_id = $1 order by created_at desc", [workspaceId]).catch(() => ({ rows: [] })),
    ]);

    return {
      status: "ready",
      providers: {
        stripe: {
          configured: Boolean(this.stripe),
          checkout: Boolean(this.stripe),
          webhookConfigured: Boolean(env.stripeWebhookSecret),
          blockedReason: this.stripe ? null : "Set STRIPE_SECRET_KEY and Stripe price IDs to activate checkout.",
        },
        razorpay: {
          configured: Boolean(this.razorpay),
          orders: Boolean(this.razorpay),
          webhookConfigured: Boolean(env.razorpayWebhookSecret),
          keyIdPublic: env.razorpayKeyId ? `${env.razorpayKeyId.slice(0, 8)}...` : null,
          blockedReason: this.razorpay ? null : "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to activate Razorpay orders.",
        },
      },
      plans,
      subscription: subscription.rows[0] || { provider: "codrai", plan: "free", status: "active" },
      wallet: wallet.rows[0],
      invoices: invoices.rows,
      quota,
      usage,
      billingEvents: events.rows,
      seats: seats.rows,
      capabilities: [
        "stripe_checkout_when_configured",
        "stripe_webhook_verification",
        "razorpay_order_creation_when_configured",
        "razorpay_webhook_verification",
        "usage_metering",
        "billing_history",
        "seat_management",
      ],
    };
  }

  async createRazorpayOrder({ workspaceId, userId, plan = "pro", credits }) {
    if (!this.razorpay) throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    if (!this.pool) throw new Error("Razorpay orders require PostgreSQL DATABASE_URL.");
    const planResult = await this.pool.query("select * from billing_plans where tier = $1 and status = 'active'", [plan]);
    const selectedPlan = planResult.rows[0];
    if (!selectedPlan) throw Object.assign(new Error("Unknown billing plan."), { statusCode: 400 });

    const creditAmount = Number(credits || 0);
    const amountCents = creditAmount > 0 ? Math.round(creditAmount * 100) : Number(selectedPlan.monthly_price_cents || 0);
    if (amountCents <= 0) throw Object.assign(new Error("Selected plan does not require an online payment order."), { statusCode: 400 });

    const receipt = `codrai_${workspaceId}_${Date.now()}`.slice(0, 40);
    const order = await this.razorpay.orders.create({
      amount: amountCents,
      currency: "INR",
      receipt,
      notes: { workspaceId, userId: userId || "", plan, credits: creditAmount ? String(creditAmount) : "" },
    });

    await this.pool.query(
      `insert into billing_events (id, workspace_id, provider, event_type, provider_event_id, payload, status, created_at)
       values ($1, $2, 'razorpay', 'order.created', $3, $4, 'created', now())
       on conflict (provider, provider_event_id) do update set payload = excluded.payload, status = excluded.status`,
      [`razorpay_order_${order.id}`, workspaceId, order.id, order]
    );

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      keyId: env.razorpayKeyId,
      plan,
      credits: creditAmount || null,
    };
  }

  async updateSeats({ workspaceId, userId, seats = 1 }) {
    if (!this.pool) throw new Error("Seat management requires PostgreSQL DATABASE_URL.");
    const workspace = await this.pool.query("select id from workspaces where id = $1", [workspaceId]);
    if (!workspace.rows[0]) {
      throw Object.assign(new Error("Seat management requires an existing authenticated workspace."), { statusCode: 400 });
    }
    const count = Number(seats);
    if (!Number.isInteger(count) || count < 1 || count > 10000) {
      throw Object.assign(new Error("seats must be an integer between 1 and 10000."), { statusCode: 400 });
    }
    const result = await this.pool.query(
      `insert into subscription_seats (id, workspace_id, seats, assigned_by, created_at, updated_at)
       values ($1, $2, $3, $4, now(), now())
       returning *`,
      [randomUUID(), workspaceId, count, userId || null]
    );
    await this.pool.query(
      `update subscriptions
       set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('seats', $2::int),
           updated_at = now()
       where workspace_id = $1`,
      [workspaceId, count]
    ).catch(() => null);
    return { seats: result.rows[0] };
  }

  async handleStripeWebhook({ payload, signature }) {
    if (!this.stripe) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
    if (!env.stripeWebhookSecret) throw new Error("Stripe webhook secret is not configured. Set STRIPE_WEBHOOK_SECRET.");
    const event = this.stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
    const workspaceId = event.data?.object?.metadata?.workspaceId || null;

    await this.pool?.query(
      `insert into billing_events (id, workspace_id, provider, event_type, provider_event_id, payload, status, created_at)
       values ($1, $2, 'stripe', $3, $4, $5, 'processed', now())
       on conflict (provider, provider_event_id) do update set payload = excluded.payload, status = 'processed'`,
      [`stripe_${event.id}`, workspaceId, event.type, event.id, event]
    );

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = event.data.object;
      await this.pool?.query(
        `insert into subscriptions (id, workspace_id, provider, provider_subscription_id, plan, status, current_period_start, current_period_end, metadata, created_at, updated_at)
         values ($1, $2, 'stripe', $3, $4, $5, to_timestamp($6), to_timestamp($7), $8, now(), now())
         on conflict (id) do update set status = excluded.status,
                                      current_period_start = excluded.current_period_start,
                                      current_period_end = excluded.current_period_end,
                                      metadata = excluded.metadata,
                                      updated_at = now()`,
        [
          subscription.id,
          workspaceId,
          subscription.id,
          subscription.metadata?.plan || "pro",
          subscription.status,
          subscription.current_period_start || Math.floor(Date.now() / 1000),
          subscription.current_period_end || Math.floor(Date.now() / 1000),
          subscription,
        ]
      );
    }

    return { received: true, type: event.type, id: event.id };
  }

  async handleRazorpayWebhook({ payload, signature }) {
    if (!env.razorpayWebhookSecret) throw new Error("Razorpay webhook secret is not configured. Set RAZORPAY_WEBHOOK_SECRET.");
    const expected = createHmac("sha256", env.razorpayWebhookSecret).update(payload).digest("hex");
    if (!signature || expected !== signature) throw Object.assign(new Error("Invalid Razorpay webhook signature."), { statusCode: 400 });

    const event = JSON.parse(payload);
    const entity = event.payload?.payment?.entity || event.payload?.order?.entity || {};
    const workspaceId = entity.notes?.workspaceId || null;
    const providerEventId = event.id || `${event.event}_${entity.id || Date.now()}`;

    await this.pool?.query(
      `insert into billing_events (id, workspace_id, provider, event_type, provider_event_id, payload, status, created_at)
       values ($1, $2, 'razorpay', $3, $4, $5, 'processed', now())
       on conflict (provider, provider_event_id) do update set payload = excluded.payload, status = 'processed'`,
      [`razorpay_${providerEventId}`, workspaceId, event.event || "unknown", providerEventId, event]
    );

    if (event.event === "payment.captured" && workspaceId && entity.notes?.plan) {
      await this.pool?.query("update workspaces set plan = $2 where id = $1", [workspaceId, entity.notes.plan]);
    }

    return { received: true, type: event.event || "unknown", id: providerEventId };
  }

  async quota({ workspaceId }) {
    if (!this.pool) throw new Error("Billing quota requires PostgreSQL DATABASE_URL.");
    const limit = await this.pool.query("select * from api_quota_limits where workspace_id = $1", [workspaceId]);
    const usage = await this.pool.query(
      `select count(*)::int as requests, coalesce(sum((usage->>'total_tokens')::bigint), 0)::bigint as tokens
       from usage_ledger where workspace_id = $1 and created_at >= date_trunc('month', now())`,
      [workspaceId]
    );
    return { limit: limit.rows[0] || null, usage: usage.rows[0] };
  }

  async #usageMeters({ workspaceId }) {
    const [developer, modelUsage, ocr, browserAutomation, jobs] = await Promise.all([
      this.pool.query(
        `select count(*)::int as requests,
                coalesce(sum(total_tokens), 0)::bigint as tokens,
                coalesce(avg(latency_ms), 0)::numeric as avg_latency_ms
         from developer_api_usage_events
         where workspace_id = $1 and created_at >= date_trunc('month', now())`,
        [workspaceId]
      ).catch(() => ({ rows: [{ requests: 0, tokens: 0, avg_latency_ms: 0 }] })),
      this.pool.query(
        `select provider, model, count(*)::int as requests,
                coalesce(sum(input_tokens + output_tokens), 0)::bigint as tokens,
                coalesce(sum(estimated_cost), 0)::numeric as estimated_cost
         from model_usage_events
         where workspace_id = $1 and created_at >= date_trunc('month', now())
         group by provider, model
         order by requests desc
         limit 20`,
        [workspaceId]
      ).catch(() => ({ rows: [] })),
      this.pool.query(
        `select count(*)::int as extractions
         from ai_memories
         where workspace_id = $1 and metadata->>'type' = 'ocr_extraction' and created_at >= date_trunc('month', now())`,
        [workspaceId]
      ).catch(() => ({ rows: [{ extractions: 0 }] })),
      this.pool.query(
        `select count(*)::int as sessions
         from ai_memories
         where workspace_id = $1 and metadata->>'type' = 'browser_session' and created_at >= date_trunc('month', now())`,
        [workspaceId]
      ).catch(() => ({ rows: [{ sessions: 0 }] })),
      this.pool.query(
        `select kind, status, count(*)::int as count
         from jobs
         where workspace_id = $1 and created_at >= date_trunc('month', now())
         group by kind, status
         order by kind, status`,
        [workspaceId]
      ).catch(() => ({ rows: [] })),
    ]);

    return {
      developer: developer.rows[0],
      modelUsage: modelUsage.rows,
      ocr: ocr.rows[0],
      browserAutomation: browserAutomation.rows[0],
      jobs: jobs.rows,
    };
  }

  async #getOrCreateCustomer({ workspaceId, email }) {
    const existing = await this.pool?.query("select stripe_customer_id from billing_customers where workspace_id = $1", [workspaceId]);
    if (existing?.rows[0]) return existing.rows[0].stripe_customer_id;

    const customer = await this.stripe.customers.create({ email, metadata: { workspaceId } });
    await this.pool?.query(
      `insert into billing_customers (workspace_id, stripe_customer_id, created_at)
       values ($1, $2, now()) on conflict (workspace_id) do update set stripe_customer_id = excluded.stripe_customer_id`,
      [workspaceId, customer.id]
    );
    return customer.id;
  }
}
