// Simple in-memory sliding window rate limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  limit?: number; // Maximum allowed requests
  windowMs?: number; // Time window in milliseconds
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): { isAllowed: boolean; remaining: number; resetInSeconds: number } {
  const limit = options.limit || 10;
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      isAllowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      isAllowed: false,
      remaining: 0,
      resetInSeconds: Math.max(0, Math.ceil((record.resetAt - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    isAllowed: true,
    remaining: limit - record.count,
    resetInSeconds: Math.max(0, Math.ceil((record.resetAt - now) / 1000)),
  };
}
