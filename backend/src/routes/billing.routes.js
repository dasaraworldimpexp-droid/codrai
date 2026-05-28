import { Router } from "express";
import { billingStatus, createRazorpayOrder, createStripeCheckout, generateUsageInvoice, getQuota, listBillingPlans, listUsageInvoices, razorpayWebhook, stripeWebhook, updateSubscriptionSeats } from "../controllers/billing.controller.js";

const router = Router();

router.get("/quota", getQuota);
router.get("/status", billingStatus);
router.get("/plans", listBillingPlans);
router.get("/usage-invoices", listUsageInvoices);
router.post("/usage-invoices", generateUsageInvoice);
router.post("/seats", updateSubscriptionSeats);
router.post("/stripe/checkout", createStripeCheckout);
router.post("/stripe/webhook", stripeWebhook);
router.post("/razorpay/orders", createRazorpayOrder);
router.post("/razorpay/webhook", razorpayWebhook);

export default router;
