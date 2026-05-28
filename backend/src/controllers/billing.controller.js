import { BillingService } from "../services/billing.service.js";
import { BillingAdminService } from "../core/billing/billing-admin.service.js";

export async function createStripeCheckout(req, res, next) {
  try {
    const service = new BillingService({ pool: req.app.locals.pool });
    const session = req.body.plan
      ? await service.createCheckoutForPlan({
        workspaceId: req.body.workspaceId || req.workspace?.id,
        userId: req.user?.id || req.body.userId,
        email: req.user?.email || req.body.email,
        plan: req.body.plan,
      })
      : await service.createCheckoutSession({
      workspaceId: req.body.workspaceId || req.workspace?.id,
      userId: req.user?.id || req.body.userId,
      email: req.user?.email || req.body.email,
      priceId: req.body.priceId,
    });
    return res.status(201).json({ id: session.id, url: session.url });
  } catch (error) {
    return next(error);
  }
}

export async function billingStatus(req, res, next) {
  try {
    const service = new BillingService({ pool: req.app.locals.pool });
    const result = await service.status({ workspaceId: req.query.workspaceId || req.workspace?.id });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createRazorpayOrder(req, res, next) {
  try {
    const service = new BillingService({ pool: req.app.locals.pool });
    const result = await service.createRazorpayOrder({
      workspaceId: req.body.workspaceId || req.workspace?.id,
      userId: req.user?.id || req.body.userId,
      plan: req.body.plan,
      credits: req.body.credits,
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function razorpayWebhook(req, res, next) {
  try {
    const service = new BillingService({ pool: req.app.locals.pool });
    const result = await service.handleRazorpayWebhook({
      payload: req.rawBody,
      signature: req.headers["x-razorpay-signature"],
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateSubscriptionSeats(req, res, next) {
  try {
    const service = new BillingService({ pool: req.app.locals.pool });
    const result = await service.updateSeats({
      workspaceId: req.body.workspaceId || req.workspace?.id,
      userId: req.user?.id || req.body.userId,
      seats: req.body.seats,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listBillingPlans(req, res, next) {
  try {
    const service = new BillingService({ pool: req.app.locals.pool });
    const plans = await service.plans();
    return res.status(200).json({ plans });
  } catch (error) {
    return next(error);
  }
}

export async function stripeWebhook(req, res, next) {
  try {
    const service = new BillingService({ pool: req.app.locals.pool });
    const result = await service.handleStripeWebhook({
      payload: req.rawBody,
      signature: req.headers["stripe-signature"],
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getQuota(req, res, next) {
  try {
    const service = new BillingService({ pool: req.app.locals.pool });
    const quota = await service.quota({ workspaceId: req.query.workspaceId || req.workspace?.id });
    return res.status(200).json(quota);
  } catch (error) {
    return next(error);
  }
}

export async function generateUsageInvoice(req, res, next) {
  try {
    const service = new BillingAdminService({ pool: req.app.locals.pool });
    const invoice = await service.generateUsageInvoice({
      workspaceId: req.workspace?.id || req.body.workspaceId,
      periodStart: req.body.periodStart,
      periodEnd: req.body.periodEnd,
    });
    return res.status(201).json({ invoice });
  } catch (error) {
    return next(error);
  }
}

export async function listUsageInvoices(req, res, next) {
  try {
    const service = new BillingAdminService({ pool: req.app.locals.pool });
    const invoices = await service.listInvoices({
      workspaceId: req.workspace?.id || req.query.workspaceId,
      limit: Number(req.query.limit || 20),
    });
    return res.status(200).json({ invoices });
  } catch (error) {
    return next(error);
  }
}
