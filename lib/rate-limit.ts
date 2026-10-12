type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

/**
 * Fixed-window rate limit in-memory.
 * Cocok untuk satu instance. Untuk multi-instance/serverless, ganti dengan store terpusat (mis. Upstash Redis).
 */
export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
  now = Date.now(),
): { ok: boolean; retryAfterSec: number } {
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) {
      if (now >= b.resetAt) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
