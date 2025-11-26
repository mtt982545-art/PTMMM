import React from 'react'
import AppShell from '@/components/layout/app-shell'
import KpiCard from '@/components/ui/kpi-card'
import { getServerUserContext, canViewSection, requireRole } from '@/lib/auth/server-auth'
import { formatNumber } from '@/lib/kpi-helpers'
import WarehouseSelect from '@/components/ui/warehouse-select'
import { redirect } from 'next/navigation'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'
import { getShipmentRouteInfoForOps } from '@/lib/services/shipments-service'
import { getRouteWithStopsAndItems } from '@/lib/services/route-service'
// computeStopBadges tidak diperlukan di halaman ini (digantikan oleh ShipmentRouteBadgesPanel)
import ShipmentRouteBadgesPanel from '@/components/ui/shipment-route-badges-panel'
import ShipmentRoutePanel from '@/components/ui/shipment-route-panel'
import RouteOverviewPanel from '@/components/ui/route-overview-panel'
import { prisma } from '@/lib/prisma'
import { getInventoryProductsForWarehouses } from '@/lib/services/inventory-service'

export const dynamic = 'force-dynamic'

export default async function OpsLoadPage({ searchParams }: { searchParams?: { ok?: string; error?: string; ship?: string; route?: string } }) {
  const user = await getServerUserContext()
  if (!user) redirect('/login')
  if (!requireRole(user, ['ops'])) redirect('/dashboard')

  let kpi = { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0, on_time_delivery: 0 }
  try {
    const { kpi: k } = await getAnalyticsOverviewForUser(user)
    kpi = k
  } catch {}

  const shipCode = (searchParams?.ship || '').trim()
  const routeCode = (searchParams?.route || '').trim()
  const routeInfo = shipCode ? await getShipmentRouteInfoForOps(user, shipCode).catch(() => null) : null
  const routeDetails = routeCode ? await getRouteWithStopsAndItems(routeCode).catch(() => null) : null
  let invByWh: Record<string, Array<{ code: string; qty: number }>> = {}
  let whCodes = new Map<string, string>()
  try {
    const wids = user.warehouseIds || []
    invByWh = await getInventoryProductsForWarehouses(user, wids)
    const wrows = await prisma.warehouse.findMany({ where: { id: { in: wids } }, select: { id: true, code: true } })
    for (const w of wrows) whCodes.set(w.id, w.code)
  } catch {}

  async function submitLoad(formData: FormData) {
    'use server'
    const eventType = String(formData.get('eventType') || '')
    const formCode = String(formData.get('formCode') || 'FORM-OPS-001')
    const shipmentId = String(formData.get('shipmentId') || '')
    const wid = String(formData.get('warehouseId') || (user.warehouseIds[0] || ''))
    const refType = String(formData.get('refType') || '')
    const idem = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const body = {
      formCode,
      shipmentId: shipmentId || undefined,
      warehouseId: wid || undefined,
      eventType,
      refType: refType || undefined,
      payload: { idempotency_key: idem, source: 'ops' },
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
      if (!res.ok) redirect('/ops/load?error=1')
      redirect('/ops/load?ok=1')
    } catch {
      redirect('/ops/load?error=1')
    }
  }

  async function viewRoute(formData: FormData) {
    'use server'
    const ship = String(formData.get('shipmentId') || '').trim()
    if (!ship) return redirect('/ops/load')
    redirect(`/ops/load?ship=${encodeURIComponent(ship)}`)
  }

  async function viewRouteByCode(formData: FormData) {
    'use server'
    const rcode = String(formData.get('routeCode') || '').trim()
    if (!rcode) return redirect('/ops/load')
    redirect(`/ops/load?route=${encodeURIComponent(rcode)}`)
  }

  return (
    <AppShell>
      <div className="py-8 px-6 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFD700' }}>Ops Load</h1>
          <p className="text-lg" style={{ color: '#b0b7c3' }}>Scan load_start/load_finish dan checkpoint</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {canViewSection(user, 'kpi') && (
            <>
              <KpiCard title="Load Start" value={formatNumber(kpi.load_start)} subtitle="" color="emerald" icon={<></>} />
              <KpiCard title="Load Finish" value={formatNumber(kpi.load_finish)} subtitle="" color="blue" icon={<></>} />
              <KpiCard title="Total Scan" value={formatNumber(kpi.scans)} subtitle="" color="yellow" icon={<></>} />
            </>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Aksi Scan</h3>
          {!!searchParams?.ok && (
            <div className="mb-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-2">Berhasil</div>
          )}
          {!!searchParams?.error && (
            <div className="mb-3 rounded border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">Gagal</div>
          )}
          {canViewSection(user, 'events') ? (
            <div className="flex flex-wrap gap-4">
              <form action={submitLoad} className="flex items-center gap-2">
                <input type="hidden" name="eventType" value="load_start" />
                <input name="formCode" defaultValue="FORM-OPS-001" className="ui-input" placeholder="Form Code" />
                <input name="shipmentId" className="ui-input" placeholder="Shipment ID (opsional)" />
                <WarehouseSelect name="warehouseId" warehouseIds={user.warehouseIds || []} defaultValue={(user.warehouseIds || [])[0] || ''} placeholder="Warehouse ID" placeholderLabel="Pilih Gudang" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Load Start</button>
              </form>
              <form action={submitLoad} className="flex items-center gap-2">
                <input type="hidden" name="eventType" value="load_finish" />
                <input name="formCode" defaultValue="FORM-OPS-001" className="ui-input" placeholder="Form Code" />
                <input name="shipmentId" className="ui-input" placeholder="Shipment ID (opsional)" />
                <WarehouseSelect name="warehouseId" warehouseIds={user.warehouseIds || []} defaultValue={(user.warehouseIds || [])[0] || ''} placeholder="Warehouse ID" placeholderLabel="Pilih Gudang" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Load Finish</button>
              </form>
              <form action={submitLoad} className="flex items-center gap-2">
                <input type="hidden" name="eventType" value="scan" />
                <input name="formCode" defaultValue="FORM-OPS-001" className="ui-input" placeholder="Form Code" />
                <input name="shipmentId" className="ui-input" placeholder="Shipment ID (opsional)" />
                <WarehouseSelect name="warehouseId" warehouseIds={user.warehouseIds || []} defaultValue={(user.warehouseIds || [])[0] || ''} placeholder="Warehouse ID" placeholderLabel="Pilih Gudang" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Scan</button>
              </form>
              <form action={submitLoad} className="flex items-center gap-2">
                <input type="hidden" name="eventType" value="scan" />
                <input type="hidden" name="refType" value="transfer" />
                <input name="formCode" defaultValue="FORM-OPS-001" className="ui-input" placeholder="Form Code" />
                <input name="shipmentId" className="ui-input" placeholder="Shipment ID (opsional)" />
                <WarehouseSelect name="warehouseId" warehouseIds={user.warehouseIds || []} defaultValue={(user.warehouseIds || [])[0] || ''} placeholder="Warehouse ID" placeholderLabel="Pilih Gudang" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Transfer</button>
              </form>
              <form action={viewRoute} className="flex items-center gap-2">
                <input name="shipmentId" className="ui-input" placeholder="Shipment ID untuk lihat route" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Lihat Route</button>
              </form>
              <form action={viewRouteByCode} className="flex items-center gap-2">
                <input name="routeCode" className="ui-input" placeholder="Route Code untuk lihat detail" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Lihat Route Code</button>
              </form>
            </div>
          ) : (
            <div className="text-sm text-yellow-200">Tidak tersedia untuk role ini</div>
          )}
        </div>

        {(canViewSection(user, 'shipments') || canViewSection(user, 'events')) && (
          <>
            {routeDetails && (
              <RouteOverviewPanel title="Panel Rute" details={routeDetails as any} />
            )}
            {!routeDetails && !!routeCode && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 p-6">Route tidak ditemukan</div>
            )}
            {routeInfo && (
              <ShipmentRoutePanel title="Panel Rute Shipment" details={{ route_path: routeInfo.route_path || [], active_leg_index: routeInfo.current_leg_index || 0 }} routePath={routeInfo.route_path || []} activeIndex={routeInfo.current_leg_index || 0} keyPrefix={shipCode} />
            )}
            <div className="mt-8 rounded-xl border border-yellow-500/30 bg-white/5 p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Inventory per Gudang</h3>
              {Object.keys(invByWh).length === 0 ? (
                <div className="text-sm" style={{ color: '#b0b7c3' }}>Tidak ada data inventory</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(invByWh).map(([wid, items]) => (
                    <div key={wid} className="rounded border border-yellow-300/20 p-3">
                      <div className="font-semibold mb-2" style={{ color: '#FFD700' }}>Gudang: {whCodes.get(wid) || wid}</div>
                      <div className="space-y-1">
                        {items.map((it) => (
                          <div key={`${wid}-${it.code}`} className="flex justify-between text-xs" style={{ color: '#b0b7c3' }}>
                            <span>{it.code}</span>
                            <span>Qty: {it.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
