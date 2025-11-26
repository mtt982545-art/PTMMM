// Gunakan logApiAccess untuk mencatat keberhasilan request (audit trail minimal)
// Gunakan logApiError untuk mencatat kegagalan request (diagnostik singkat) 
import { prisma } from '@/lib/prisma'
type AnyRecord = Record<string, any>

export async function logApiError(path: string, error: unknown, context?: AnyRecord) {
  const payload = {
    path,
    error: error instanceof Error ? error.message : String(error),
    context: context ?? undefined,
  }
  try {
    await (prisma as any).apiLog.create({ data: { route: path, method: 'ERROR', status: 500, actor: undefined, message: JSON.stringify(payload), durationMs: null } })
  } catch {}
  console.error('[api:error]', JSON.stringify(payload))
}

export async function logApiAccess(path: string, method: string, status: number, actor?: string, message?: string, durationMs?: number) {
  const payload = { path, method, status, actor: actor ?? undefined, message: message ?? undefined, durationMs: durationMs ?? undefined }
  try {
    const isProd = process.env.NODE_ENV === 'production'
    if (!isProd || status >= 400) {
      await (prisma as any).apiLog.create({ data: { route: path, method, status, actor: actor ?? null, message: message ?? null, durationMs: typeof durationMs === 'number' ? Math.round(durationMs) : null } })
    }
  } catch {}
  console.log('[api:access]', JSON.stringify(payload))
}
