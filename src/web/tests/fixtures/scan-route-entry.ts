import { toHttpResponse, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { logApiAccess, logApiError } from '@/lib/logging'
import { getServerUserContext, canViewSection, requireRole } from '@/lib/auth/server-auth'
import { createScanEvent } from '@/lib/services/scan-service'

export async function POST(req: Request) {
  const start = Date.now()
  try {
    const ctx = await getServerUserContext()
    if (!ctx) throw new UnauthorizedError()
    const allowed = requireRole(ctx, ['ops','security']) && canViewSection(ctx, 'events')
    if (!allowed) throw new ForbiddenError()
    const token = req.headers.get('x-scan-token') || ''
    if (!process.env.SCAN_WRITE_TOKEN || token !== process.env.SCAN_WRITE_TOKEN) throw new UnauthorizedError()
    const body = await req.json()
    const record = await createScanEvent(body)
    logApiAccess('/api/scan', 'POST', 200, ctx.email, 'created', Date.now() - start)
    return Response.json({ ok: true, id: record.id })
  } catch (error) {
    logApiError('/api/scan', error)
    return toHttpResponse(error)
  }
}