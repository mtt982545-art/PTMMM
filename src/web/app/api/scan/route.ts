import { toHttpResponse } from '@/lib/errors';
import { createScanEvent } from '@/lib/services/scan-service';
import { logApiAccess, logApiError } from '@/lib/logging';
import { guardApiRoute } from '@/lib/auth/route-guard';

export const POST = guardApiRoute(async (req) => {
  const start = Date.now()
  try {
    const cookie = req.headers.get('cookie') || ''
    const isDemo = /(?:^|;\s*)demo_session=1(?:;|$)/.test(cookie)
    if (isDemo) {
      return new Response(JSON.stringify({ ok: false, message: 'Forbidden: demo mode' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
    const body = await req.json()
    const record = await createScanEvent({ ...body, userEmail: typeof body?.userEmail === 'string' && body.userEmail ? body.userEmail : (req.headers.get('x-user-email') || undefined) })
    logApiAccess('/api/scan', 'POST', 200, body?.userEmail, 'created', Date.now() - start)
    return Response.json({ ok: true, id: record.id })
  } catch (e) {
    logApiError('/api/scan', e)
    return toHttpResponse(e)
  }
}, { section: 'events', roles: ['ops','security'], token: { header: 'x-scan-token', env: 'SCAN_WRITE_TOKEN' }, rateLimit: { path: '/api/scan', limit: 120, windowMs: 60_000, tokenHeaderName: 'x-scan-token' } })
