import { NextRequest, NextResponse } from 'next/server'
import { logApiAccess } from '@/lib/logging'

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true, message: 'Demo logout' })
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set('demo_session', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0, secure })
  res.cookies.set('demo_mode', '', { httpOnly: false, sameSite: 'lax', path: '/', maxAge: 0, secure })
  logApiAccess('/api/demo-logout', 'POST', 200, undefined, 'demo_logout', undefined)
  return res
}