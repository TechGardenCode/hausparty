import Redis from "ioredis";

let client: Redis | null = null;
let warned = false;

// Lazy singleton. When REDIS_URL is unset (e.g. local dev without Redis
// wired), returns null and callers should fail open. When set, ioredis
// connects on first command with auto-reconnect.
export function getRedis(): Redis | null {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) {
    if (!warned) {
      console.warn("[redis] REDIS_URL not set — rate limiting disabled (fail-open)");
      warned = true;
    }
    return null;
  }
  client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 2000,
  });
  client.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
  });
  return client;
}
