/**
 * Login API Route
 * 
 * Testing Scenarios:
 * 1. Login dengan email/password valid - harus return redirect per role
 * 2. Login dengan password salah - harus return 401 Unauthorized
 * 3. Login dengan email tidak terdaftar - harus return 401 Unauthorized
 * 4. Login dengan JSON invalid - harus return 400 Bad JSON
 * 5. Login dengan input kosong - harus return 400 Invalid input
 * 6. Verifikasi redirect: marketing → /marketing/dashboard
 * 7. Verifikasi redirect: ops → /ops/dashboard  
 * 8. Verifikasi redirect: security → /security/gate
 * 9. Verifikasi redirect: driver → /driver/home
 * 10. Verifikasi redirect: admin → /admin
 * 11. Test custom redirect path yang valid - harus diikuti
 * 12. Test custom redirect path yang invalid - harus fallback ke /dashboard
 * 13. Verifikasi role yang dikembalikan sesuai user_org_role table
 * 14. Test rate limiting jika diimplementasikan
 * 15. Test session cookie dibuat setelah login sukses
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';
import { getUserRoles } from '../../../lib/auth/getUserRoles';
import type { AppRole } from '../../../lib/types';
import { getDashboardPathForRole } from '../../../lib/types';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  redirect: z.string().optional(),
});

const buckets = new Map<string, { tokens: number; last: number }>();
function getIP(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xrip = req.headers.get('x-real-ip');
  if (xrip) return xrip;
  return 'local';
}
async function allowRate(ip: string, limitPerMin = parseInt(process.env.LOGIN_RATE_LIMIT || '60')) {
  if (process.env.NODE_ENV === 'test') return true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const now = Date.now();
  const key = `rate:login:${ip}:${Math.floor(now / 60000)}`;
  if (url && token) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: [["INCR", key], ["EXPIRE", key, 60]] }),
      });
      if (!res.ok) throw new Error('upstash');
      const data = await res.json();
      const count = Array.isArray(data) ? (data[0] && typeof data[0].result === 'number' ? data[0].result : 0) : (typeof data.result === 'number' ? data.result : 0);
      if (count <= limitPerMin) return true;
      return false;
    } catch {}
  }
  const b = buckets.get(key) ?? { tokens: limitPerMin, last: now };
  const refill = Math.floor((now - b.last) / 60000) * limitPerMin;
  b.tokens = Math.min(limitPerMin, b.tokens + Math.max(refill, 0));
  b.last = now;
  const ok = b.tokens > 0;
  if (ok) b.tokens--;
  buckets.set(key, b);
  return ok;
}

function getCookie(header: string | null, name: string) {
  if (!header) return null;
  const parts = header.split(/;\s*/);
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx > 0) {
      const k = p.slice(0, idx);
      const v = p.slice(idx + 1);
      if (k === name) return decodeURIComponent(v);
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  // Parse JSON aman
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Bad JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Invalid input' }, { status: 400 });
  }

  const { email, password, redirect } = parsed.data;

  if (process.env.ENABLE_CSRF_LOGIN === 'true') {
    const hdr = req.headers.get('x-csrf-token') || '';
    const cookieHdr = req.headers.get('cookie');
    const cval = getCookie(cookieHdr, 'csrf_token') || '';
    if (!hdr || !cval || hdr !== cval) {
      return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }
  }

  const ip = getIP(req);
  const allowed = await allowRate(ip);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: 'Rate limit' }, { status: 429 });
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Sign-in password
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ ok: false, message: error.message || 'Unauthorized' }, { status: 401 });
  }

  // RBAC: ambil semua role/org untuk user
  const rows = await getUserRoles(supabase, email)
  const ck = cookies()
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, redirect: '/no-role', role: null })
  }
  if (rows.length === 1) {
    const only = rows[0]
    ck.set('active_role', only.role, { httpOnly: true, path: '/', sameSite: 'lax' })
    ck.set('active_org_id', String(only.org_id), { httpOnly: true, path: '/', sameSite: 'lax' })
    const dest = getDashboardPathForRole(only.role)
    return NextResponse.json({ ok: true, redirect: dest, role: only.role })
  }
  // multi-role: arahkan ke halaman pemilihan
  return NextResponse.json({ ok: true, redirect: '/auth/select-role', role: null })

  const isSafeRelativePath = (p: string) => /^\/(?!\/)[\w\-\/.?=&%]*$/.test(p);
  const safeRedirect = (p?: string) => (p && isSafeRelativePath(p) ? p : null);

  // tidak dipakai lagi karena kasus ditangani di atas
  return NextResponse.json({ ok: true, redirect: '/dashboard', role: null })
}
