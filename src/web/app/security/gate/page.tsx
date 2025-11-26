import React from 'react'
import AppShell from '@/components/layout/app-shell'
import KpiCard from '@/components/ui/kpi-card'
import { getServerUserContext, canViewSection, requireRole } from '@/lib/auth/server-auth'
import { formatNumber } from '@/lib/kpi-helpers'
import WarehouseSelect from '@/components/ui/warehouse-select'
import { redirect } from 'next/navigation'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'
import { getRouteWithStopsAndItems } from '@/lib/services/route-service'
import { getShipmentRouteInfoForSecurity } from '@/lib/services/shipments-service'
import RouteOverviewPanel from '@/components/ui/route-overview-panel'
import ShipmentRouteBadgesPanel from '@/components/ui/shipment-route-badges-panel'
import ShipmentRoutePanel from '@/components/ui/shipment-route-panel'
import { getGateViewByShipmentOrToken } from '@/lib/services/gate-view-service'

export const dynamic = 'force-dynamic'

export default async function SecurityGatePage({ searchParams }: { searchParams?: { ok?: string; error?: string; route?: string; ship?: string } }) {
  const user = await getServerUserContext()
  if (!user) redirect('/login')
  if (!requireRole(user, ['security'])) redirect('/dashboard')

  let kpi = { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0, on_time_delivery: 0 }
  try {
    const { kpi: k } = await getAnalyticsOverviewForUser(user)
    kpi = k
  } catch {}

  const routeCode = (searchParams?.route || '').trim()
  const shipCode = (searchParams?.ship || '').trim()
  const routeDetails = routeCode ? await getRouteWithStopsAndItems(routeCode).catch(() => null) : null
  const shipRouteInfo = shipCode ? await getShipmentRouteInfoForSecurity(user, shipCode).catch(() => null) : null
  const gateView = shipCode ? await getGateViewByShipmentOrToken({ shipmentId: shipCode }, user) : null

  async function submitGate(formData: FormData) {
    'use server'
    const eventType = String(formData.get('eventType') || '')
    const formCode = String(formData.get('formCode') || 'FORM-OPS-001')
    const shipmentId = String(formData.get('shipmentId') || '')
    const wid = String(formData.get('warehouseId') || (user.warehouseIds[0] || ''))
    const idem = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const body = {
      formCode,
      shipmentId: shipmentId || undefined,
      warehouseId: wid || undefined,
      eventType,
      payload: { idempotency_key: idem, source: 'security' },
      userEmail: user.email,
      idempotencyKey: idem,
    }
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-scan-token': process.env.SCAN_WRITE_TOKEN || '' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (!res.ok) redirect('/security/gate?error=1')
      redirect('/security/gate?ok=1')
    } catch {
      redirect('/security/gate?error=1')
    }
  }

  async function viewRouteByCode(formData: FormData) {
    'use server'
    const rcode = String(formData.get('routeCode') || '').trim()
    if (!rcode) return redirect('/security/gate')
    redirect(`/security/gate?route=${encodeURIComponent(rcode)}`)
  }

  async function viewRouteByShipment(formData: FormData) {
    'use server'
    const ship = String(formData.get('shipmentId') || '').trim()
    if (!ship) return redirect('/security/gate')
    redirect(`/security/gate?ship=${encodeURIComponent(ship)}`)
  }

  return (
    <AppShell>
      <div className="py-8 px-6 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFD700' }}>Security Gate</h1>
          <p className="text-lg" style={{ color: '#b0b7c3' }}>Monitor gate-in/gate-out dan akses cepat scan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {canViewSection(user, 'events') && (
            <>
              <KpiCard title="Gate In" value={formatNumber(kpi.gate_in)} subtitle="" color="emerald" icon={<></>} />
              <KpiCard title="Gate Out" value={formatNumber(kpi.gate_out)} subtitle="" color="blue" icon={<></>} />
            </>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Aksi Cepat</h3>
          {!!searchParams?.ok && (
            <div className="mb-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-2">Berhasil</div>
          )}
          {!!searchParams?.error && (
            <div className="mb-3 rounded border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">Gagal</div>
          )}
          {canViewSection(user, 'events') ? (
            <div className="flex flex-wrap gap-4">
              <form action={submitGate} className="flex items-center gap-2">
                <input type="hidden" name="eventType" value="gate_in" />
                <input name="formCode" defaultValue="FORM-OPS-001" className="ui-input" placeholder="Form Code" />
                <input name="shipmentId" className="ui-input" placeholder="Shipment ID (opsional)" />
                <WarehouseSelect name="warehouseId" warehouseIds={user.warehouseIds || []} defaultValue={(user.warehouseIds || [])[0] || ''} placeholder="Warehouse ID" placeholderLabel="Pilih Gudang" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Gate In</button>
              </form>
              <form action={submitGate} className="flex items-center gap-2">
                <input type="hidden" name="eventType" value="gate_out" />
                <input name="formCode" defaultValue="FORM-OPS-001" className="ui-input" placeholder="Form Code" />
                <input name="shipmentId" className="ui-input" placeholder="Shipment ID (opsional)" />
                <WarehouseSelect name="warehouseId" warehouseIds={user.warehouseIds || []} defaultValue={(user.warehouseIds || [])[0] || ''} placeholder="Warehouse ID" placeholderLabel="Pilih Gudang" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Gate Out</button>
              </form>
              <form action={viewRouteByCode} className="flex items-center gap-2">
                <input name="routeCode" className="ui-input" placeholder="Route Code untuk ringkasan" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Lihat Route</button>
              </form>
              <form action={viewRouteByShipment} className="flex items-center gap-2">
                <input name="shipmentId" className="ui-input" placeholder="Shipment ID untuk ringkasan" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Lihat Shipment</button>
              </form>
            </div>
          ) : (
            <div className="text-sm text-yellow-200">Tidak tersedia untuk role ini</div>
          )}
        </div>

        {(canViewSection(user, 'events') || canViewSection(user, 'shipments')) && (
          <>
            {routeDetails && (
              <RouteOverviewPanel title="Ringkasan Rute" details={routeDetails as any} />
            )}
            {!routeDetails && routeCode && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 p-6">Route tidak ditemukan</div>
            )}
            {shipRouteInfo && (
              <ShipmentRoutePanel title="Ringkasan Shipment" details={{ route_path: shipRouteInfo.route_path || [], active_leg_index: shipRouteInfo.current_leg_index || 0 }} routePath={shipRouteInfo.route_path || []} activeIndex={shipRouteInfo.current_leg_index || 0} keyPrefix={shipCode} />
            )}
            {gateView && (
              <div className="mt-6 rounded-xl border border-yellow-500/30 bg-white/5 p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Detail Gate</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm" style={{ color: '#b0b7c3' }}>Shipment: {gateView.shipment?.shipmentId} | {gateView.shipment?.origin} → {gateView.shipment?.destination}</div>
                    <div className="text-sm" style={{ color: '#b0b7c3' }}>Driver: {gateView.driver?.name || '—'} {gateView.driver?.phone ? `(${gateView.driver.phone})` : ''}</div>
                    <div className="text-sm" style={{ color: '#b0b7c3' }}>Armada: {gateView.vehicle?.plateNumber || '—'} {gateView.vehicle?.name ? `(${gateView.vehicle.name})` : ''}</div>
                    <div className="text-sm" style={{ color: '#b0b7c3' }}>Surat Jalan: {gateView.docs?.surat?.refCode || '—'}</div>
                    <div className="text-sm" style={{ color: '#b0b7c3' }}>Invoice: {gateView.docs?.invoice?.refCode || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#FFD700' }}>Barang</div>
                    <div className="space-y-1">
                      {gateView.items?.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs" style={{ color: '#b0b7c3' }}>
                          <span>{it.productCode} {it.productName ? `— ${it.productName}` : ''}</span>
                          <span>{Number(it.qtyUnit || 0)} {it.uom || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
