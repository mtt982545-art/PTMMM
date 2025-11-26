export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { toHttpResponse } from '@/lib/errors'
import { logApiAccess, logApiError } from '@/lib/logging'
import { guardApiRoute } from '@/lib/auth/route-guard'
import { createScanEvent } from '@/lib/services/scan-service'

export const POST = guardApiRoute(async (req, ctx) => {
  const start = Date.now()
  try {
    let body: unknown
    try { body = await req.json() } catch { return new Response(JSON.stringify({ ok: false, message: 'Bad JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }) }
    const payload = typeof body === 'object' && body ? { ...(body as any), userEmail: (body as any)?.userEmail || ctx.email } : { userEmail: ctx.email }
    const rec = await createScanEvent(payload as any)
    logApiAccess('/api/driver/pod', 'POST', 200, ctx.email, 'pod', Date.now() - start)
    return Response.json({ ok: true, id: rec.id })
  } catch (e) {
    logApiError('/api/driver/pod', e)
    return toHttpResponse(e)
  }
}, { section: 'shipments', roles: ['driver'], token: { header: 'x-scan-token', env: 'SCAN_WRITE_TOKEN' }, rateLimit: { path: '/api/driver/pod', limit: 120, windowMs: 60_000, tokenHeaderName: 'x-scan-token' } })
