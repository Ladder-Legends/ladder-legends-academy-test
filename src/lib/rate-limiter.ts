/**
 * Simple in-memory rate limiter for download endpoints
 * Uses sliding window algorithm
 */

interface RateLimitEntry {
  timestamps: number[];
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove timestamps older than 1 hour
    entry.timestamps = entry.timestamps.filter(ts => ts > oneHourAgo);

    // Remove entry if no recent timestamps and not blocked
    if (entry.timestamps.length === 0 && (!entry.blockedUntil || entry.blockedUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}, 3600000); // Run every hour

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * How long to block after exceeding limit (in seconds)
   */
  blockDurationSeconds?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  blockedUntil?: Date;
}

/**
 * Check if a request is allowed based on rate limits
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  // Get or create entry
  let entry = rateLimitStore.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(identifier, entry);
  }

  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.blockedUntil),
      blockedUntil: new Date(entry.blockedUntil),
    };
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  // Check if limit exceeded
  if (entry.timestamps.length >= config.maxRequests) {
    // Block if configured
    if (config.blockDurationSeconds) {
      entry.blockedUntil = now + (config.blockDurationSeconds * 1000);
    }

    const oldestTimestamp = Math.min(...entry.timestamps);
    const resetAt = new Date(oldestTimestamp + windowMs);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      blockedUntil: entry.blockedUntil ? new Date(entry.blockedUntil) : undefined,
    };
  }

  // Add current timestamp
  entry.timestamps.push(now);

  const remaining = config.maxRequests - entry.timestamps.length;
  const oldestTimestamp = entry.timestamps[0] || now;
  const resetAt = new Date(oldestTimestamp + windowMs);

  return {
    allowed: true,
    remaining,
    resetAt,
  };
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}
