// Simple in-memory fixed-window rate limiter. Per-process — fine for a single
// instance; swap the store for Redis/Upstash if you scale horizontally.
const buckets = new Map();

export function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, remaining: limit - entry.count, retryAfter: 0 };
}

// Periodic cleanup so the map can't grow unbounded.
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets) {
    if (now > value.reset) buckets.delete(key);
  }
}, 5 * 60_000);
cleanup.unref?.();

export function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
