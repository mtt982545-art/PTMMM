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
import { getUserRole } from '../../../lib/auth/getUserRole';
import type { AppRole } from '../../../lib/types';
import { ROLE_DESTINATIONS } from '../../../lib/types';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  redirect: z.string().optional(),
});

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

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Sign-in password
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ ok: false, message: error.message || 'Unauthorized' }, { status: 401 });
  }

  // RBAC: ambil role, utamakan mapping dashboard per-role
  const role = await getUserRole(supabase, email);
  
  if (!role) {
    console.warn(`Login successful but no role found for user: ${email}`);
    // User ada di auth tapi belum ada di user_org_role - kasih tahu frontend
    return NextResponse.json({ 
      ok: true, 
      redirect: '/dashboard', 
      role: null,
      warning: 'User belum memiliki role yang ditetapkan'
    });
  }

  const isSafeRelativePath = (p: string) => /^\/(?!\/)[\w\-\/.?=&%]*$/.test(p);
  const safeRedirect = (p?: string) => (p && isSafeRelativePath(p) ? p : null);

  const dest = role ? ROLE_DESTINATIONS[role] : safeRedirect(redirect) ?? '/dashboard';

  return NextResponse.json({ ok: true, redirect: dest, role: role });
}

