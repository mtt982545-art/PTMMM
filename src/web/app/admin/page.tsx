import React from 'react'
import AppShell from '@/components/layout/app-shell'
import KpiCard from '@/components/ui/kpi-card'
import { getServerUserContext, requireRole, canViewSection } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'
import { getAdminSummary } from '@/lib/services/admin-dashboard-service'
import { getRouteWithStopsAndItems } from '@/lib/services/route-service'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'
import { getTrackingTimeline } from '@/lib/services/tracking-service'
import { formatNumber, formatPercentage } from '@/lib/kpi-helpers'
import KpiTrendChart from '@/components/ui/kpi-trend-chart'
import UiPanel from '@/components/ui/ui-panel'
import { formatTokenHint } from '@/lib/ui/formatters'
import RouteOverviewPanel from '@/components/ui/route-overview-panel'

export const dynamic = 'force-dynamic'

export default async function AdminPage({ searchParams }: { searchParams?: { route?: string; token?: string } }) {
  const ctx = await getServerUserContext()
  if (!ctx) redirect('/login')
  if (!requireRole(ctx, ['admin'])) redirect('/dashboard')
  let summary = { organizations: 0, activeWarehouses: 0, usersByRole: {} as Record<string, number> }
  try {
    summary = await getAdminSummary(ctx)
  } catch {}
  let kpi = { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0, on_time_delivery: 0 }
  let dailyData: Array<{ day: string }> = []
  try {
    const overview = await getAnalyticsOverviewForUser(ctx)
    kpi = overview.kpi
    dailyData = overview.data || []
  } catch {}
  const routeCode = (searchParams?.route || '').trim()
  const routeDetails = routeCode ? await getRouteWithStopsAndItems(routeCode).catch(() => null) : null
  const token = (searchParams?.token || '').trim()
  const timeline = token ? await getTrackingTimeline(token).catch(() => null) : null
  async function viewRoute(formData: FormData) {
    'use server'
    const r = String(formData.get('routeCode') || '').trim()
    if (!r) return redirect('/admin')
    redirect(`/admin?route=${encodeURIComponent(r)}`)
  }
  async function viewToken(formData: FormData) {
    'use server'
    const t = String(formData.get('token') || '').trim()
    if (!t) return redirect('/admin')
    redirect(`/admin?token=${encodeURIComponent(t)}`)
  }
  return (
    <AppShell>
      <div className="py-8 px-6 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFD700' }}>Admin Dashboard</h1>
          <p className="text-lg" style={{ color: '#b0b7c3' }}>Kontrol pusat administrasi dan konfigurasi sistem</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {canViewSection(ctx, 'kpi') && (
            <>
              <KpiCard title="Gate In" value={formatNumber(kpi.gate_in)} subtitle="" color="emerald" icon={<></>} />
              <KpiCard title="Load Finish" value={formatNumber(kpi.load_finish)} subtitle="" color="blue" icon={<></>} />
              <KpiCard title="Total Scan" value={formatNumber(kpi.scans)} subtitle="" color="yellow" icon={<></>} />
              <KpiCard title="On-time Delivery" value={formatPercentage(kpi.on_time_delivery)} subtitle="" color="emerald" icon={<></>} />
            </>
          )}
        </div>
        {canViewSection(ctx, 'kpi') && (
          <UiPanel title="KPI Trend">
            <KpiTrendChart data={dailyData as any} />
          </UiPanel>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>Konteks Pengguna</h2>
            <div className="space-y-2 text-sm" style={{ color: '#b0b7c3' }}>
              <div><span className="font-medium" style={{ color: '#fff' }}>Email:</span> {ctx.email}</div>
              <div><span className="font-medium" style={{ color: '#fff' }}>Org ID:</span> {ctx.orgId ?? '—'}</div>
              <div>
                <span className="font-medium" style={{ color: '#fff' }}>Warehouse IDs:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(ctx.warehouseIds || []).length === 0 ? (
                    <span className="px-2 py-1 rounded bg-gray-800/60 text-gray-300">—</span>
                  ) : (
                    ctx.warehouseIds.map((w) => (
                      <span key={w} className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-200 border border-yellow-500/30">{w}</span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <span className="font-medium" style={{ color: '#fff' }}>Sections Allowed:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(ctx.sectionsAllowed || []).map((s) => (
                    <span key={s} className="px-2 py-1 rounded bg-green-500/20 text-green-200 border border-green-500/30">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>Ringkasan Organisasi</h2>
            <div className="space-y-3 text-sm" style={{ color: '#b0b7c3' }}>
              <div><span className="font-medium" style={{ color: '#fff' }}>Jumlah Organization:</span> {summary.organizations}</div>
              <div><span className="font-medium" style={{ color: '#fff' }}>Gudang Aktif:</span> {summary.activeWarehouses}</div>
            </div>
          </div>
          <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>User per Role</h2>
            <div className="flex flex-wrap gap-2">
              {Object.keys(summary.usersByRole).length === 0 ? (
                <span className="px-2 py-1 rounded bg-gray-800/60 text-gray-300">—</span>
              ) : (
                Object.entries(summary.usersByRole).map(([role, count]) => (
                  <span key={role} className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30">{role}: {count}</span>
                ))
              )}
            </div>
          </div>
          <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>Aksi Cepat</h2>
            <div className="grid grid-cols-1 gap-3">
              <a href="/dashboard" className="ui-btn ui-btn--outline ui-pressable">Dashboard</a>
              <a href="/modul-x" className="ui-btn ui-btn--outline ui-pressable">Digital Tracking</a>
              <a href="/tracking/FORM-OPS-001" className="ui-btn ui-btn--outline ui-pressable">Tracking Sample</a>
            </div>
          </div>
        </div>
        {(canViewSection(ctx, 'shipments') || canViewSection(ctx, 'kpi')) && (
          <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>Route Overview</h2>
            <form action={viewRoute} className="flex items-center gap-2 mb-4">
              <input name="routeCode" className="ui-input" placeholder={formatTokenHint('route')} />
              <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Tampilkan</button>
            </form>
            {routeDetails ? (
              <>
                <RouteOverviewPanel title="Route Overview" details={routeDetails as any} />
                {!!(routeDetails.shipments || []).length && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: '#FFD700' }}>Shipments</h3>
                    <div className="flex flex-wrap gap-2">
                      {routeDetails.shipments.map((sh) => (
                        <span key={sh.id} className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30">{sh.shipment_id}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : routeCode ? (
              <div className="rounded border border-red-500/30 bg-red-500/10 text-red-300 p-3">Route tidak ditemukan</div>
            ) : null}
          </div>
        )}
        {(canViewSection(ctx, 'events') || canViewSection(ctx, 'kpi')) && (
          <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>Scan Timeline</h2>
          <form action={viewToken} className="flex items-center gap-2 mb-4">
            <input name="token" className="ui-input" placeholder={formatTokenHint('token')} />
            <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Tampilkan</button>
          </form>
            {timeline ? (
              <div className="space-y-3 text-sm" style={{ color: '#b0b7c3' }}>
                <div><span className="font-medium" style={{ color: '#fff' }}>Shipment:</span> {timeline.shipment_id ?? '—'}</div>
                <div><span className="font-medium" style={{ color: '#fff' }}>Status:</span> {timeline.status}</div>
                <div><span className="font-medium" style={{ color: '#fff' }}>ETA:</span> {timeline.estimated_delivery ?? '—'}</div>
                <div className="mt-2">
                  <ul className="space-y-2">
                    {timeline.events.map((e) => (
                      <li key={e.id} className="rounded border border-yellow-500/20 p-3">
                        <div className="text-yellow-300">{e.event_type.toUpperCase()}</div>
                        <div className="text-xs">{new Date(e.event_time).toLocaleString()}</div>
                        <div>{e.location} — {e.description}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : token ? (
              <div className="rounded border border-red-500/30 bg-red-500/10 text-red-300 p-3">Timeline tidak ditemukan</div>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  )
}
