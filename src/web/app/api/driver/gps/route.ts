import { toHttpResponse } from '@/lib/errors'
import { logApiAccess, logApiError } from '@/lib/logging'
import { guardApiRoute } from '@/lib/auth/route-guard'
import { createGpsPing } from '@/lib/services/gps-service'

export const POST = guardApiRoute(async (req, ctx) => {
  const start = Date.now()
  try {
    let body: unknown
    try { body = await req.json() } catch { return new Response(JSON.stringify({ ok: false, message: 'Bad JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }) }
    const rec = await createGpsPing(ctx, body as any)
    logApiAccess('/api/driver/gps', 'POST', 200, ctx.email, 'gps_ping', Date.now() - start)
    return Response.json({ ok: true, id: rec.id })
  } catch (e) {
    logApiError('/api/driver/gps', e)
    return toHttpResponse(e)
  }
}, { section: 'shipments', roles: ['driver'], token: { header: 'x-gps-token', env: 'GPS_WRITE_TOKEN' }, rateLimit: { path: '/api/driver/gps', limit: 120, windowMs: 60_000, tokenHeaderName: 'x-gps-token' } })
