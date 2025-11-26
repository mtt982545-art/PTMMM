import { toHttpResponse, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { logApiAccess, logApiError } from '@/lib/logging'
import { getServerUserContext, canViewSection, requireRole } from '@/lib/auth/server-auth'
import { getRouteWithStopsAndItems } from '@/lib/services/route-service'

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const start = Date.now()
  try {
    const ctx = await getServerUserContext()
    if (!ctx) throw new UnauthorizedError()
    const allowed = requireRole(ctx, ['admin','ops','driver']) && canViewSection(ctx, 'shipments')
    if (!allowed) throw new ForbiddenError()
    const data = await getRouteWithStopsAndItems(params.code)
    if (!data) {
      logApiAccess(`/api/route/${params.code}`, 'GET', 404, ctx.email, 'not-found', Date.now() - start)
      return Response.json({ ok: false, message: 'Not found' }, { status: 404 })
    }
    logApiAccess(`/api/route/${params.code}`, 'GET', 200, ctx.email, 'ok', Date.now() - start)
    return Response.json({ ok: true, data })
  } catch (error) {
    logApiError(`/api/route/${params.code}`, error)
    return toHttpResponse(error)
  }
}