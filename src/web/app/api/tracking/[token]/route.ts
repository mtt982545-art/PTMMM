export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { toHttpResponse } from '@/lib/errors'
import { getTrackingTimeline } from '@/lib/services/tracking-service'
import { logApiAccess, logApiError } from '@/lib/logging'
import { applyRateLimit } from '@/lib/rate-limit'

/**
 * Endpoint publik tracking timeline
 * - Rate limit: 60 req/menit per IP
 * - Respons sukses: { ok: true, data }
 * - Not found: { ok: false, message: 'Not found' }
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const start = Date.now()
  try {
    const limited = applyRateLimit(_req, { path: '/api/tracking', limit: 60, windowMs: 60_000 })
    if (limited) return limited
    const data = await getTrackingTimeline(params.token)
    if (!data) {
      logApiAccess(`/api/tracking/${params.token}`, 'GET', 404, undefined, 'not-found', Date.now() - start)
      return Response.json({ ok: false, message: 'Not found' }, { status: 404 })
    }
    logApiAccess(`/api/tracking/${params.token}`, 'GET', 200, undefined, 'ok', Date.now() - start)
    return Response.json({ ok: true, data })
  } catch (error) {
    logApiError(`/api/tracking/${params.token}`, error)
    return toHttpResponse(error)
  }
}