import { applyRateLimit } from '@/lib/rate-limit'
import { UnauthorizedError, ForbiddenError, toHttpResponse } from '@/lib/errors'
import type { AppRole, PermissionSection, UserContext } from '@/lib/types'
import { getServerUserContext, ensureSectionAccess } from './server-auth'

type RateCfg = { path: string; limit: number; windowMs: number; tokenHeaderName?: string }
type TokenCfg = { header: string; env: string }
type GuardCfg = { roles?: AppRole[]; section?: PermissionSection; rateLimit?: RateCfg; token?: TokenCfg; tokenForbiddenOnMismatch?: boolean }

export function guardApiRoute<TArgs = any>(
  handler: (req: Request, ctx: UserContext, args?: TArgs) => Promise<Response>,
  cfg: GuardCfg
) {
  return async function (req?: Request, args?: TArgs): Promise<Response> {
    const r = req ?? new Request('http://local')
    try {
      if (cfg.rateLimit) {
        const limited = applyRateLimit(r, cfg.rateLimit)
        if (limited) return limited
      }
      if (cfg.token) {
        const token = r.headers.get(cfg.token.header) || ''
        const expected = process.env[cfg.token.env]
        if (!expected) throw new UnauthorizedError()
        if (!token) throw new UnauthorizedError()
        if (token !== expected) {
          if (cfg.tokenForbiddenOnMismatch) throw new ForbiddenError()
          throw new UnauthorizedError()
        }
      }
      const ctx = await getServerUserContext()
      if (!ctx) throw new UnauthorizedError()
      if (cfg.section && cfg.roles) {
        if (!ensureSectionAccess(ctx, cfg.section, cfg.roles)) throw new ForbiddenError()
      }
      return handler(r, ctx, args)
    } catch (error) {
      return toHttpResponse(error)
    }
  }
}