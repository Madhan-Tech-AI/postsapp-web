/**
 * Rate Limiter for Auth and Sensitive Operations
 *
 * Implements a sliding window rate limiter.
 * Supports Upstash Redis if configured, with an in-memory LRU fallback.
 *
 * Requirements:
 * - Rate limit login, registration, password reset, resend-verification (per IP + per identifier)
 * - Work across serverless instances when Redis is provided, safe in-memory fallback for local/dev
 */

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

// In-memory store fallback for development / local
interface MemoryRecord {
  timestamps: number[]
}

const memoryStore = new Map<string, MemoryRecord>()

// Periodically prune stale entries to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    Array.from(memoryStore.entries()).forEach(([key, record]) => {
      record.timestamps = record.timestamps.filter((t: number) => now - t < 3600_000)
      if (record.timestamps.length === 0) {
        memoryStore.delete(key)
      }
    })
  }, 300_000) // Every 5 minutes
}

/**
 * Check and record a rate limit attempt
 *
 * @param key Unique key for the rate limit target (e.g. `auth:login:1.2.3.4` or `auth:login:user@example.com`)
 * @param maxAttempts Maximum allowed attempts in the window
 * @param windowSeconds Window duration in seconds
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  const now = Date.now()
  const windowMs = windowSeconds * 1000

  // 1. Try Upstash Redis if configured
  if (upstashUrl && upstashToken) {
    try {
      const response = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['ZREMRANGEBYSCORE', key, 0, now - windowMs],
          ['ZADD', key, now, `${now}-${Math.random()}`],
          ['ZCARD', key],
          ['EXPIRE', key, windowSeconds],
        ]),
      })

      if (response.ok) {
        const results = await response.json()
        const count = results[2]?.result ?? 1
        const remaining = Math.max(0, maxAttempts - count)
        return {
          success: count <= maxAttempts,
          remaining,
          resetAt: now + windowMs,
        }
      }
    } catch {
      // Fallback to in-memory on Redis error
    }
  }

  // 2. In-memory sliding window fallback
  let record = memoryStore.get(key)
  if (!record) {
    record = { timestamps: [] }
    memoryStore.set(key, record)
  }

  // Filter out timestamps outside the sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs)

  if (record.timestamps.length >= maxAttempts) {
    const oldest = record.timestamps[0]
    return {
      success: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    }
  }

  record.timestamps.push(now)
  return {
    success: true,
    remaining: maxAttempts - record.timestamps.length,
    resetAt: now + windowMs,
  }
}

/**
 * Extract client IP from headers safely
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    // Return first IP in list (client IP)
    return forwarded.split(',')[0].trim()
  }
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const cfIp = headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  return '127.0.0.1'
}

/** Clear rate limit for testing */
export function _resetMemoryRateLimit() {
  memoryStore.clear()
}
