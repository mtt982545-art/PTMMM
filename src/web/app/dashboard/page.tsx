import AppShell from '@/components/layout/app-shell'
import KpiCard from '@/components/ui/kpi-card'
import InteractiveButton from '@/app/(client)/interactive-button'
import { getServerUserContext, canViewSection } from '@/lib/auth/server-auth'
import { formatNumber, formatPercentage } from '@/lib/kpi-helpers'
import { getRoleQuickActions, getRoleDisplayName } from '@/lib/navigation-helpers'
import { redirect } from 'next/navigation'
import { getDashboardPathForRole } from '@/lib/types'

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getServerUserContext();
  if (!user) redirect('/login')
  const dest = getDashboardPathForRole(user.role)
  if (dest !== '/dashboard') redirect(dest)
  let kpi = { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0, on_time_delivery: 0 }
  let events: Array<{ day: string; gate_in: number; gate_out: number; load_start: number; load_finish: number; scans: number }> = []
  try {
    const res = await fetch('/api/analytics/overview', { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      if (json && typeof json === 'object') {
        kpi = json.kpi || kpi
        if (canViewSection(user, 'events')) {
          events = json.data || []
        }
      }
    }
  } catch {}

  return (
    <AppShell>
      <div className="py-8 px-6 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFD700' }}>Dashboard PT. MMM</h1>
          <p className="text-lg" style={{ color: '#b0b7c3' }}>Real-time monitoring performa logistik</p>
          <p className="mt-2 text-sm" style={{ color: '#b0b7c3' }}>Peran: {getRoleDisplayName(user.role)}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {canViewSection(user, 'kpi') && (
            <>
              <KpiCard title="Gate In" value={formatNumber(kpi.gate_in)} subtitle="" color="emerald" icon={<></>} />
              <KpiCard title="Load Finish" value={formatNumber(kpi.load_finish)} subtitle="" color="blue" icon={<></>} />
              <KpiCard title="Total Scan" value={formatNumber(kpi.scans)} subtitle="" color="yellow" icon={<></>} />
              <KpiCard title="On-time Delivery" value={formatPercentage(kpi.on_time_delivery)} subtitle="" color="emerald" icon={<></>} />
            </>
          )}
        </div>

        {canViewSection(user, 'events') && events.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Ringkasan Events 7 Hari</h3>
            <div className="overflow-x-auto rounded-lg border border-yellow-300/20">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: '#FFD700' }}>
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Gate In</th>
                    <th className="py-2 px-3">Gate Out</th>
                    <th className="py-2 px-3">Load Start</th>
                    <th className="py-2 px-3">Load Finish</th>
                    <th className="py-2 px-3">Total Scans</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((d) => (
                    <tr key={d.day} className="border-t border-yellow-300/10" style={{ color: '#b0b7c3' }}>
                      <td className="py-2 px-3">{d.day}</td>
                      <td className="py-2 px-3">{formatNumber(d.gate_in)}</td>
                      <td className="py-2 px-3">{formatNumber(d.gate_out)}</td>
                      <td className="py-2 px-3">{formatNumber(d.load_start)}</td>
                      <td className="py-2 px-3">{formatNumber(d.load_finish)}</td>
                      <td className="py-2 px-3">{formatNumber(d.scans)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Panel Peran</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
              <h4 className="text-md font-semibold mb-3" style={{ color: '#FFD700' }}>Aksi Cepat</h4>
              <div className="flex flex-wrap gap-3">
                {getRoleQuickActions(user.role).map((a) => (
                  <InteractiveButton key={a.name} href={a.href} className="ui-btn ui-btn--outline ui-pressable">{a.name}</InteractiveButton>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
              <h4 className="text-md font-semibold mb-3" style={{ color: '#FFD700' }}>Navigasi Peran</h4>
              <div className="flex flex-wrap gap-3">
                {user.role === 'admin' && (
                  <>
                    <a href="/admin" className="ui-btn ui-btn--outline ui-pressable">Admin Dashboard</a>
                    <a href="/admin/organizations" className="ui-btn ui-btn--outline ui-pressable">Organisasi</a>
                    <a href="/admin/warehouses" className="ui-btn ui-btn--outline ui-pressable">Gudang</a>
                    <a href="/admin/users" className="ui-btn ui-btn--outline ui-pressable">Pengguna</a>
                  </>
                )}
                {user.role === 'marketing' && (
                  <a href="/dashboard/marketing" className="ui-btn ui-btn--outline ui-pressable">Marketing Dashboard</a>
                )}
                {user.role === 'ops' && (
                  <>
                    <a href="/ops/load" className="ui-btn ui-btn--outline ui-pressable">Scan Event</a>
                    <a href="/tracking/FORM-OPS-001" className="ui-btn ui-btn--outline ui-pressable">Tracking Sample</a>
                  </>
                )}
                {user.role === 'security' && (
                  <>
                    <a href="/security/gate" className="ui-btn ui-btn--outline ui-pressable">Gate Monitor</a>
                    <a href="/security/gate" className="ui-btn ui-btn--outline ui-pressable">Scan Event</a>
                  </>
                )}
                {user.role === 'driver' && (
                  <a href="/driver/home" className="ui-btn ui-btn--outline ui-pressable">Dashboard Driver</a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
