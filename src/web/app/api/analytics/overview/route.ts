export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { toHttpResponse } from '@/lib/errors'
import { logApiAccess, logApiError } from '@/lib/logging'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'
import { guardApiRoute } from '@/lib/auth/route-guard'
import { ensureSectionAccess } from '@/lib/auth/server-auth'

export const GET = guardApiRoute(async (_req, ctx) => {
  const start = Date.now()
  try {
    const allowEvents = ensureSectionAccess(ctx, 'events', ['admin','ops'])
    const { data, kpi } = await getAnalyticsOverviewForUser(ctx)
    logApiAccess('/api/analytics/overview', 'GET', 200, ctx.email, allowEvents ? 'kpi-events-ok' : 'kpi-ok', Date.now() - start)
    return Response.json({ ok: true, data: allowEvents ? data : [], kpi })
  } catch (error) {
    logApiError('/api/analytics/overview', error)
    return toHttpResponse(error)
  }
}, { section: 'kpi', roles: ['admin','ops','marketing'], rateLimit: { path: '/api/analytics/overview', limit: 120, windowMs: 60_000 } })
