import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/rate-limit'
import { logApiAccess, logApiError } from '@/lib/logging'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(5)
})

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const limited = applyRateLimit(req as unknown as Request, { path: '/api/demo-login', limit: 20, windowMs: 60_000 })
    if (limited) return limited
    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ ok: false, message: 'Bad JSON' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ ok: false, message: 'Invalid input' }, { status: 400 })
    const { email, password } = parsed.data
    if (email.toLowerCase() !== 'demo@example.com' || password !== 'Demo123') {
      logApiAccess('/api/demo-login', 'POST', 401, email, 'invalid_demo', Date.now() - start)
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true, redirect: '/dashboard' })
    const secure = process.env.NODE_ENV === 'production'
    res.cookies.set('demo_session', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 3600, secure })
    res.cookies.set('demo_mode', '1', { httpOnly: false, sameSite: 'lax', path: '/', maxAge: 3600, secure })
    logApiAccess('/api/demo-login', 'POST', 200, email, 'demo_login', Date.now() - start)
    return res
  } catch (error) {
    logApiError('/api/demo-login', error)
    return NextResponse.json({ ok: false, message: 'Unexpected error' }, { status: 500 })
  }
}