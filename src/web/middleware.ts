import { NextResponse, type NextRequest } from 'next/server'
/**
 * Public pages security headers (CSP, XFO, XCTO, Referrer-Policy)
 * - Applied to `/tracking/*` and `/modul-x`
 * - CSP tuned to avoid breaking Next.js/Tailwind on current setup
 */

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  const isPublicPage = path.startsWith('/tracking/') || path === '/modul-x'
  if (isPublicPage) {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
    res.headers.set('Content-Security-Policy', csp)
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'no-referrer')
  }
  return res
}

export const config = {
  matcher: ['/tracking/:path*', '/modul-x'],
}
