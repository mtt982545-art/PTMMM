import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getUserRoles } from '@/lib/auth/getUserRoles'
import { getDashboardPathForRole } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '';
  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    await supabase.auth.exchangeCodeForSession(code);
    const { data: { user } } = await (supabase as any).auth.getUser()
    const rows = await getUserRoles(supabase as any, user?.email || '')
    if (!rows.length) {
      return NextResponse.redirect(new URL('/no-role', request.url), 302)
    }
    if (rows.length === 1) {
      const ck = cookies()
      ck.set('active_role', rows[0].role, { httpOnly: true, path: '/', sameSite: 'lax' })
      ck.set('active_org_id', String(rows[0].org_id), { httpOnly: true, path: '/', sameSite: 'lax' })
      const dest = getDashboardPathForRole(rows[0].role)
      return NextResponse.redirect(new URL(dest, request.url), 302)
    }
    return NextResponse.redirect(new URL('/auth/select-role', request.url), 302)
  }
  const dest = (next && /^\/(?!\/)[\w\-\/.?=&%]*$/.test(next)) ? next : '/dashboard'
  return NextResponse.redirect(new URL(dest, request.url), 302);
}
