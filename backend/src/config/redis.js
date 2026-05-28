import Redis from "ioredis";
import { env } from "./env.js";

export function createRedisClient() {
  if (!env.redisUrl) {
    return null;
  }

  const client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > Number(process.env.REDIS_MAX_RETRIES || 3)) {
        return null;
      }
      return Math.min(times * 250, 1000);
    },
  });

  client.on("error", (error) => {
    if (process.env.REDIS_LOG_CONNECTION_ERRORS === "true") {
      console.warn(`Redis connection error: ${error.message}`);
    }
  });

  return client;
}
