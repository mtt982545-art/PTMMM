/**
 * Fixed-window in-memory rate limiter (dev/demo friendly)
 * - Key: ip:path[:token]
 * - Suitable for local/dev; replace with distributed store (e.g., Redis)
 *   in production for accuracy and resilience.
 */
type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

export function keyFor(ip: string, path: string, extra?: string): string {
  return `${ip}:${path}${extra ? ':' + extra : ''}`
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const existing = store.get(key)
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 0, resetAt: now + windowMs }
    store.set(key, fresh)
  }
  const bucket = store.get(key) as Bucket
  bucket.count += 1
  store.set(key, bucket)
  const allowed = bucket.count <= limit
  const remaining = Math.max(0, limit - bucket.count)
  return { allowed, remaining, resetAt: bucket.resetAt }
}

export function resetRateLimiter(): void {
  store.clear()
}

function extractIpFromHeaders(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for') || headers.get('x-real-ip') || headers.get('cf-connecting-ip') || headers.get('x-client-ip')
  if (fwd) return fwd.split(',')[0].trim()
  return '127.0.0.1'
}

export function applyRateLimit(req: Request, cfg: { path: string; limit: number; windowMs: number; tokenHeaderName?: string }): Response | null {
  const ip = extractIpFromHeaders(req.headers)
  const token = cfg.tokenHeaderName ? req.headers.get(cfg.tokenHeaderName) || undefined : undefined
  const key = keyFor(ip, cfg.path, token)
  const { allowed } = checkRateLimit(key, cfg.limit, cfg.windowMs)
  if (!allowed) {
    return new Response(JSON.stringify({ ok: false, message: 'Too Many Requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
  return null
}