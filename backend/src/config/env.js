import dotenv from "dotenv";

dotenv.config();

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
  falApiKey: process.env.FAL_API_KEY,
  stabilityApiKey: process.env.STABILITY_API_KEY,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  xaiApiKey: process.env.XAI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  mistralApiKey: process.env.MISTRAL_API_KEY,
  deepSeekApiKey: process.env.DEEPSEEK_API_KEY,
  togetherApiKey: process.env.TOGETHER_API_KEY,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
  runwayApiKey: process.env.RUNWAY_API_KEY,
  replicateApiToken: process.env.REPLICATE_API_TOKEN,
  defaultTextModel: process.env.DEFAULT_TEXT_MODEL || "gpt-4o-mini",
  defaultCodingModel: process.env.DEFAULT_CODING_MODEL || "gpt-4o",
  defaultEmbeddingModel: process.env.DEFAULT_EMBEDDING_MODEL || "text-embedding-3-small",
  defaultImageModel: process.env.DEFAULT_IMAGE_MODEL || "gpt-image-1",
  jwtSecret: process.env.JWT_SECRET,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePricePremium: process.env.STRIPE_PRICE_PREMIUM,
  stripePricePro: process.env.STRIPE_PRICE_PRO,
  stripePriceBusiness: process.env.STRIPE_PRICE_BUSINESS,
  stripePriceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  publicAppUrl: process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || "http://localhost:5173",
});

export function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
