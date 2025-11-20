import { toHttpResponse, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { logApiAccess, logApiError } from '@/lib/logging'
import { getServerUserContext, canViewSection, requireRole } from '@/lib/auth/server-auth'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'

export async function GET() {
  const start = Date.now()
  try {
    const ctx = await getServerUserContext()
    if (!ctx) throw new UnauthorizedError()
    const allowKpi = requireRole(ctx, ['admin', 'ops', 'marketing']) && canViewSection(ctx, 'kpi')
    const allowEvents = requireRole(ctx, ['admin', 'ops']) && canViewSection(ctx, 'events')
    if (!allowKpi) throw new ForbiddenError()
    const { data, kpi } = await getAnalyticsOverviewForUser(ctx)
    logApiAccess('/api/analytics/overview', 'GET', 200, ctx.email, allowEvents ? 'kpi-events-ok' : 'kpi-ok', Date.now() - start)
    return Response.json({ ok: true, data: allowEvents ? data : [], kpi })
  } catch (error) {
    logApiError('/api/analytics/overview', error)
    return toHttpResponse(error)
  }
}