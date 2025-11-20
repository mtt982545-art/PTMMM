// Gunakan logApiAccess untuk mencatat keberhasilan request (audit trail minimal)
// Gunakan logApiError untuk mencatat kegagalan request (diagnostik singkat) 
type AnyRecord = Record<string, any>

export function logApiError(path: string, error: unknown, context?: AnyRecord) {
  const payload = {
    path,
    error: error instanceof Error ? error.message : String(error),
    context: context ?? undefined,
  }
  console.error('[api:error]', JSON.stringify(payload))
}

export function logApiAccess(path: string, method: string, status: number, actor?: string, message?: string, durationMs?: number) {
  const payload = { path, method, status, actor: actor ?? undefined, message: message ?? undefined, durationMs: durationMs ?? undefined }
  console.log('[api:access]', JSON.stringify(payload))
}