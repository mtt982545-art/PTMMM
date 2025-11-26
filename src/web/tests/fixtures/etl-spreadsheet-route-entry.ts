import { toHttpResponse, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors'
import { logApiAccess, logApiError } from '@/lib/logging'
import { getServerUserContext, requireRole } from '@/lib/auth/server-auth'
import { importSpreadsheet } from '@/lib/services/etl-service'

export async function POST(req: Request) {
  const start = Date.now()
  try {
    const token = req.headers.get('x-etl-token') || ''
    if (!token) throw new UnauthorizedError()
    if (!process.env.ETL_WRITE_TOKEN || token !== process.env.ETL_WRITE_TOKEN) {
      throw new ForbiddenError()
    }
    const ctx = await getServerUserContext()
    if (!ctx) throw new UnauthorizedError()
    const allowed = requireRole(ctx, ['admin', 'ops'])
    if (!allowed) throw new ForbiddenError()
    let body: any
    try { body = await req.json() } catch { throw new ValidationError('Bad JSON') }
    const payload = {
      source: body?.source,
      sheetName: body?.sheet_name,
      rows: Array.isArray(body?.rows) ? body.rows : [],
      meta: body?.meta,
    }
    const res = await importSpreadsheet(payload as any)
    logApiAccess('/api/etl/spreadsheet', 'POST', 200, ctx.email, 'import-ok', Date.now() - start)
    return Response.json({ ok: true, import_id: res.importId, rows: res.rows })
  } catch (error) {
    logApiError('/api/etl/spreadsheet', error)
    return toHttpResponse(error)
  }
}