import { NextRequest } from 'next/server';
// avoid next/headers for test compatibility; read cookies from request headers
import { toHttpResponse, UnauthorizedError } from '@/lib/errors';
import { createScanEvent } from '@/lib/services/scan-service';
import { logApiAccess, logApiError } from '@/lib/logging';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const start = Date.now();
    const cookie = req.headers.get('cookie') || ''
    const isDemo = /(?:^|;\s*)demo_session=1(?:;|$)/.test(cookie)
    if (isDemo) {
      return new Response(JSON.stringify({ ok: false, message: 'Forbidden: demo mode' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
    const limited = applyRateLimit(req as unknown as Request, { path: '/api/scan', limit: 120, windowMs: 60_000, tokenHeaderName: 'x-scan-token' })
    if (limited) return limited
    const token = req.headers.get('x-scan-token');
    if (!token || token !== process.env.SCAN_WRITE_TOKEN) throw new UnauthorizedError();
    const body = await req.json();
    const record = await createScanEvent(body);
    logApiAccess('/api/scan', 'POST', 200, body?.userEmail, 'created', Date.now() - start);
    return Response.json({ ok: true, id: record.id });
  } catch (e) {
    logApiError('/api/scan', e);
    return toHttpResponse(e);
  }
}