import AppShell from '@/components/layout/app-shell'
import { redirect } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function NoRolePage() {
  const supa = getServerSupabase()
  const { data } = await supa.auth.getUser()
  if (!data.user) redirect('/login')
  return (
    <AppShell>
      <div className="py-8 px-6 space-y-6">
        <h1 className="text-2xl font-semibold" style={{ color: '#FFD700' }}>Akun belum memiliki role</h1>
        <p className="text-sm" style={{ color: '#b0b7c3' }}>Silakan hubungi admin untuk diberikan akses organisasi/peran yang sesuai.</p>
        <div className="flex gap-3">
          <a className="ui-btn ui-btn--outline ui-pressable" href="mailto:helpdesk@ptmmm.co">Hubungi Admin</a>
          <a className="ui-btn ui-btn--outline ui-pressable" href="/login">Kembali ke Login</a>
        </div>
      </div>
    </AppShell>
  )
}
