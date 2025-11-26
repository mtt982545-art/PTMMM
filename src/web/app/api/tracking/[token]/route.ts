export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { toHttpResponse } from '@/lib/errors'
import { getTrackingTimeline } from '@/lib/services/tracking-service'
import { logApiAccess, logApiError } from '@/lib/logging'
import { guardApiRoute } from '@/lib/auth/route-guard'

export const GET = guardApiRoute(async (_req: Request, ctx, args?: { params: { token: string } }) => {
  const start = Date.now()
  const token = args?.params?.token as string
  try {
    const data = await getTrackingTimeline(token)
    if (!data) {
      logApiAccess(`/api/tracking/${token}`, 'GET', 404, ctx.email, 'not-found', Date.now() - start)
      return Response.json({ ok: false, message: 'Not found' }, { status: 404 })
    }
    logApiAccess(`/api/tracking/${token}`, 'GET', 200, ctx.email, 'ok', Date.now() - start)
    return Response.json({ ok: true, data })
  } catch (error) {
    logApiError(`/api/tracking/${token}`, error)
    return toHttpResponse(error)
  }
}, { section: 'shipments', roles: ['admin','ops','driver'], rateLimit: { path: '/api/tracking', limit: 60, windowMs: 60_000 } })