import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import type { NextRequest } from "next/server";
import { getRedis } from "./redis";

export interface LimiterSpec {
  keyPrefix: string;
  points: number; // requests allowed
  duration: number; // per seconds
}

export interface LimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
  retryAfterMs: number; // 0 when allowed
}

const limiters = new Map<string, RateLimiterRedis>();

function getLimiter(spec: LimiterSpec): RateLimiterRedis | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${spec.keyPrefix}:${spec.points}:${spec.duration}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: spec.keyPrefix,
      points: spec.points,
      duration: spec.duration,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// Extract the IP of the first hop from X-Forwarded-For. Envoy appends the
// real client IP as the first entry. Falls back to "unknown" so a missing
// header doesn't collapse every request into the same bucket (which would
// make the limiter trivially DoSable by a single attacker).
export function clientIp(req: NextRequest | Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

// Consume one token from a limiter, keyed by `subject` (e.g. userId or IP).
// Fails open on Redis errors or missing client — a broken rate limiter
// must never break the app.
export async function checkLimit(
  spec: LimiterSpec,
  subject: string,
): Promise<LimitResult> {
  const limiter = getLimiter(spec);
  if (!limiter) {
    return { allowed: true, remaining: -1, resetAt: 0, retryAfterMs: 0 };
  }
  try {
    const res = await limiter.consume(subject, 1);
    return {
      allowed: true,
      remaining: res.remainingPoints,
      resetAt: Date.now() + res.msBeforeNext,
      retryAfterMs: 0,
    };
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + err.msBeforeNext,
        retryAfterMs: err.msBeforeNext,
      };
    }
    // Redis unreachable or unexpected error — fail open.
    console.error("[rate-limit] unexpected error:", err);
    return { allowed: true, remaining: -1, resetAt: 0, retryAfterMs: 0 };
  }
}

// Standard response headers describing the rate-limit state.
export function rateLimitHeaders(
  spec: LimiterSpec,
  result: LimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-ratelimit-limit": String(spec.points),
    "x-ratelimit-remaining": String(Math.max(0, result.remaining)),
  };
  if (result.resetAt > 0) {
    headers["x-ratelimit-reset"] = String(Math.floor(result.resetAt / 1000));
  }
  if (!result.allowed) {
    headers["retry-after"] = String(Math.ceil(result.retryAfterMs / 1000));
  }
  return headers;
}
