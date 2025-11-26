import { toHttpResponse, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { getTrackingTimeline } from '@/lib/services/tracking-service'
import { logApiAccess, logApiError } from '@/lib/logging'
import { getServerUserContext, canViewSection, requireRole } from '@/lib/auth/server-auth'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const start = Date.now()
  try {
    const ctx = await getServerUserContext()
    if (!ctx) throw new UnauthorizedError()
    const allowed = requireRole(ctx, ['admin','ops','driver']) && canViewSection(ctx, 'shipments')
    if (!allowed) throw new ForbiddenError()
    const data = await getTrackingTimeline(params.token)
    if (!data) {
      logApiAccess(`/api/tracking/${params.token}`, 'GET', 404, ctx.email, 'not-found', Date.now() - start)
      return Response.json({ ok: false, message: 'Not found' }, { status: 404 })
    }
    logApiAccess(`/api/tracking/${params.token}`, 'GET', 200, ctx.email, 'ok', Date.now() - start)
    return Response.json({ ok: true, data })
  } catch (error) {
    logApiError(`/api/tracking/${params.token}`, error)
    return toHttpResponse(error)
  }
}