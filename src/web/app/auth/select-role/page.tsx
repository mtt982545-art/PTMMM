import AppShell from '@/components/layout/app-shell'
import { getServerSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDashboardPathForRole, parseRole, type AppRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function selectRoleAction(formData: FormData) {
  'use server'
  const role = String(formData.get('role') || '') as AppRole
  const orgId = String(formData.get('orgId') || '')
  const ck = cookies()
  ck.set('active_role', role, { httpOnly: true, path: '/', sameSite: 'lax' })
  ck.set('active_org_id', orgId, { httpOnly: true, path: '/', sameSite: 'lax' })
  redirect(getDashboardPathForRole(role))
}

export default async function SelectRolePage() {
  const supa = getServerSupabase()
  const { data } = await supa.auth.getUser()
  const user = data.user
  if (!user?.email) redirect('/login')
  const { data: rows } = await supa
    .from('user_org_role')
    .select('org_id, role')
    .eq('user_email', user.email)
  const list = Array.isArray(rows) ? rows : []
  if (list.length === 0) redirect('/no-role')
  if (list.length === 1) {
    const r = list[0]
    const ck = cookies()
    ck.set('active_role', String(r.role), { httpOnly: true, path: '/', sameSite: 'lax' })
    ck.set('active_org_id', String(r.org_id), { httpOnly: true, path: '/', sameSite: 'lax' })
    const role = parseRole(r.role) || null
    redirect(getDashboardPathForRole(role))
  }
  return (
    <AppShell>
      <div className="py-8 px-6 space-y-6">
        <h1 className="text-2xl font-semibold" style={{ color: '#FFD700' }}>Pilih Organisasi & Peran</h1>
        <p className="text-sm" style={{ color: '#b0b7c3' }}>Akun Anda memiliki beberapa peran. Pilih salah satu untuk melanjutkan.</p>
        <form action={selectRoleAction} className="space-y-3">
          <div className="space-y-2">
            {list.map((r, idx) => (
              <label key={idx} className="flex items-center gap-2">
                <input type="radio" name="role" value={String(r.role)} required />
                <input type="hidden" name="orgId" value={String(r.org_id)} />
                <span className="text-sm" style={{ color: '#b0b7c3' }}>{String(r.org_id)} — {String(r.role).toUpperCase()}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Lanjutkan</button>
        </form>
      </div>
    </AppShell>
  )
}

