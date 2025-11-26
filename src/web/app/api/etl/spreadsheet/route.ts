import { toHttpResponse, ValidationError } from '@/lib/errors'
import { logApiAccess, logApiError } from '@/lib/logging'
import { importSpreadsheet } from '@/lib/services/etl-service'
import { guardApiRoute } from '@/lib/auth/route-guard'

export const POST = guardApiRoute(async (req) => {
  const start = Date.now()
  try {
    let body: any
    try { body = await req.json() } catch { throw new ValidationError('Bad JSON') }
    const payload = {
      source: body?.source,
      sheetName: body?.sheet_name,
      rows: Array.isArray(body?.rows) ? body.rows : [],
      meta: body?.meta,
    }
    const res = await importSpreadsheet(payload as any)
    logApiAccess('/api/etl/spreadsheet', 'POST', 200, undefined, 'import-ok', Date.now() - start)
    return Response.json({ ok: true, import_id: res.importId, rows: res.rows })
  } catch (error) {
    logApiError('/api/etl/spreadsheet', error)
    return toHttpResponse(error)
  }
}, { section: 'events', roles: ['admin','ops'], token: { header: 'x-etl-token', env: 'ETL_WRITE_TOKEN' }, tokenForbiddenOnMismatch: true, rateLimit: { path: '/api/etl/spreadsheet', limit: 60, windowMs: 60_000, tokenHeaderName: 'x-etl-token' } })
