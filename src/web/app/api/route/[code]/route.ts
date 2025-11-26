export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { toHttpResponse } from '@/lib/errors'
import { logApiAccess, logApiError } from '@/lib/logging'
import { getRouteWithStopsAndItems } from '@/lib/services/route-service'
import { guardApiRoute } from '@/lib/auth/route-guard'

export const GET = guardApiRoute(async (_req: Request, ctx, args?: { params: { code: string } }) => {
  const start = Date.now()
  const code = args?.params?.code as string
  try {
    const data = await getRouteWithStopsAndItems(code)
    if (!data) {
      logApiAccess(`/api/route/${code}`, 'GET', 404, ctx.email, 'not-found', Date.now() - start)
      return Response.json({ ok: false, message: 'Not found' }, { status: 404 })
    }
    logApiAccess(`/api/route/${code}`, 'GET', 200, ctx.email, 'ok', Date.now() - start)
    return Response.json({ ok: true, data })
  } catch (error) {
    logApiError(`/api/route/${code}`, error)
    return toHttpResponse(error)
  }
}, { section: 'shipments', roles: ['admin','ops','driver'], rateLimit: { path: '/api/route', limit: 60, windowMs: 60_000 } })