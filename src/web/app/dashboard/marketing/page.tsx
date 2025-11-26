import React from 'react'
import AppShell from '@/components/layout/app-shell'
import KpiCard from '@/components/ui/kpi-card'
import { getServerUserContext, canViewSection, requireRole } from '@/lib/auth/server-auth'
import { formatNumber, formatPercentage } from '@/lib/kpi-helpers'
import { redirect } from 'next/navigation'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'
import { getRecentOrdersForUser } from '@/lib/services/marketing-dashboard-service'
import { getRouteWithStopsAndItems } from '@/lib/services/route-service'
import { getShipmentRouteInfoForAdmin, createShipmentWithAccess } from '@/lib/services/shipments-service'
import { getInventoryProductsForWarehouses } from '@/lib/services/inventory-service'
import { listAvailableSchedulesForWarehouses } from '@/lib/services/scheduling-service'
import { createInvoiceForShipment, linkScheduleToShipment } from '@/lib/services/documents-service'
import { buildShipmentQrToken, upsertShipmentQrToken } from '@/lib/services/qr-token'
import RouteOverviewPanel from '@/components/ui/route-overview-panel'
import ShipmentRouteBadgesPanel from '@/components/ui/shipment-route-badges-panel'
import ShipmentRoutePanel from '@/components/ui/shipment-route-panel'
import KpiTrendChart from '@/components/ui/kpi-trend-chart'
import UiPanel from '@/components/ui/ui-panel'
import { formatTokenHint } from '@/lib/ui/formatters'
import { prisma } from '@/lib/prisma'
import WarehouseSelect from '@/components/ui/warehouse-select'
import QrTicketCard from '@/components/ui/qr-ticket'

export const dynamic = 'force-dynamic'

export default async function MarketingDashboardPage({ searchParams }: { searchParams?: { route?: string; ship?: string } }) {
  const user = await getServerUserContext()
  if (!user) redirect('/login')
  if (!requireRole(user, ['marketing'])) redirect('/dashboard')

  let kpi = { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0, on_time_delivery: 0 }
  let dailyData: Array<{ day: string }> = []
  let orders: Array<{ id: string; order_code: string; customer: string; origin: string; destination: string; status: string }> = []
  try {
    const overview = await getAnalyticsOverviewForUser(user)
    kpi = overview.kpi
    dailyData = overview.data || []
  } catch {}
  try {
    if (canViewSection(user, 'orders')) {
      orders = await getRecentOrdersForUser(user)
    }
  } catch {}

  const routeCode = (searchParams?.route || '').trim()
  const shipCode = (searchParams?.ship || '').trim()
  const routeDetails = routeCode ? await getRouteWithStopsAndItems(routeCode).catch(() => null) : null
  const shipmentRouteInfo = shipCode ? await getShipmentRouteInfoForAdmin(user, shipCode).catch(() => null) : null
  async function viewRoute(formData: FormData) {
    'use server'
    const r = String(formData.get('routeCode') || '').trim()
    if (!r) return redirect('/dashboard/marketing')
    redirect(`/dashboard/marketing?route=${encodeURIComponent(r)}`)
  }

  async function viewShipment(formData: FormData) {
    'use server'
    const s = String(formData.get('shipmentId') || '').trim()
    if (!s) return redirect('/dashboard/marketing')
    redirect(`/dashboard/marketing?ship=${encodeURIComponent(s)}`)
  }

  async function createShipment(formData: FormData) {
    'use server'
    const u = await getServerUserContext()
    if (!u || !requireRole(u, ['marketing'])) return redirect('/dashboard/marketing?error=forbidden')
    const shipment_id = String(formData.get('shipmentId') || '').trim()
    const customer = String(formData.get('customer') || '').trim()
    const origin = String(formData.get('origin') || '').trim()
    const destination = String(formData.get('destination') || '').trim()
    const status = String(formData.get('status') || 'in_transit').trim() || 'in_transit'
    const formCode = String(formData.get('formCode') || '').trim()
    const warehouseIdInput = String(formData.get('warehouseId') || '').trim()
    const productSel = String(formData.get('productSel') || '').trim()
    const scheduleId = String(formData.get('scheduleId') || '').trim()
    const invoiceNo = String(formData.get('invoiceNo') || '').trim()
    const invoiceType = String(formData.get('invoiceType') || '').trim()
    const invoiceAmountRaw = String(formData.get('invoiceAmount') || '').trim()
    const invoiceAmount = invoiceAmountRaw ? Number(invoiceAmountRaw) : undefined
    const uom = String(formData.get('uom') || 'PCS').trim() || 'PCS'
    const qtyUnitRaw = String(formData.get('qtyUnit') || '0').trim()
    const qtyUnit = Number(qtyUnitRaw || '0')
    if (!shipment_id || !customer || !origin || !destination) return redirect('/dashboard/marketing?error=invalid')
    const created = await createShipmentWithAccess(u, { shipment_id, customer, origin, destination, status })
    const organizationId = u.orgId
    const warehouseId = warehouseIdInput || (u.warehouseIds[0] || '')
    if (organizationId && warehouseId) {
      try {
        await prisma.shipment.update({ where: { id: created.id }, data: { organizationId, warehouseId } })
      } catch {}
      try {
        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { code: true } })
        const whMain = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { code: true } })
        const orgCode = org?.code || organizationId
        const mainWarehouseCode = whMain?.code || warehouseId
        let productCode = ''
        let productWarehouseId = warehouseId
        if (productSel && productSel.includes('|')) {
          const parts = productSel.split('|')
          productWarehouseId = parts[0]
          productCode = parts[1]
        }
        if (productCode) {
          try {
            const inv = await getInventoryProductsForWarehouses(u, [productWarehouseId])
            const items = inv[productWarehouseId] || []
            const found = items.find((x) => x.code === productCode)
            const availableQty = Number(found?.qty || 0)
            if (isFinite(availableQty) && availableQty >= 0 && qtyUnit > availableQty) {
              return redirect('/dashboard/marketing?error=insufficient_stock')
            }
          } catch {}
        }
        if (productCode) {
          const whProd = await prisma.warehouse.findUnique({ where: { id: productWarehouseId }, select: { code: true } })
          const warehouseCode = whProd?.code || productWarehouseId
          await prisma.shipmentItem.create({
            data: {
              shipmentId: created.id,
              routeStopId: null,
              organizationId,
              warehouseId: productWarehouseId,
              productCode,
              productName: productCode,
              uom,
              collyCount: 0,
              qtyUnit: Number.isFinite(qtyUnit) ? qtyUnit : 0,
              weightKg: null,
              volumeM3: null,
              notes: null,
            },
          })
          const token = buildShipmentQrToken({ shipmentId: shipment_id, formCode, productCode, orgCode, warehouseCode, invoiceNo: invoiceNo || undefined })
          await upsertShipmentQrToken({ token, organizationId, warehouseId: productWarehouseId, shipmentInternalId: created.id, createdBy: u.email })
        } else {
          const token = buildShipmentQrToken({ shipmentId: shipment_id, formCode, orgCode, warehouseCode: mainWarehouseCode, invoiceNo: invoiceNo || undefined })
          await upsertShipmentQrToken({ token, organizationId, warehouseId, shipmentInternalId: created.id, createdBy: u.email })
        }
        if (invoiceNo) { try { await createInvoiceForShipment(u, created.id, { invoiceNo, invoiceType: invoiceType || undefined, amount: invoiceAmount }) } catch {} }
        if (scheduleId) {
          try {
            const sched = await (prisma as any).routeSchedule.findUnique({ where: { id: scheduleId }, select: { organizationId: true, warehouseId: true } })
            const allowed = sched && sched.organizationId === organizationId && (u.warehouseIds || []).includes(sched.warehouseId)
            if (allowed) await linkScheduleToShipment(u, created.id, scheduleId)
          } catch {}
        }
      } catch {}
    }
    return redirect(`/dashboard/marketing?ship=${encodeURIComponent(shipment_id)}&ok=1`)
  }

  let shipments: Array<{ id: string; shipmentId: string; customer: string; origin: string; destination: string; status: string }> = []
  let qrTokens = new Map<string, string>()
  let invByWh: Record<string, Array<{ code: string; qty: number }>> = {}
  let whCodes = new Map<string, string>()
  let schedules: Array<{ id: string; warehouseId: string; driver?: any; vehicle?: any; startAt?: Date; endAt?: Date; shift?: string }> = []
  try {
    shipments = await prisma.shipment.findMany({ where: { organizationId: user.orgId }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, shipmentId: true, customer: true, origin: true, destination: true, status: true } })
    const qrs = await prisma.qrTicket.findMany({ where: { organizationId: user.orgId, shipmentId: { in: shipments.map(s => s.id) }, status: 'active' }, orderBy: { createdAt: 'desc' }, select: { shipmentId: true, token: true } })
    for (const q of qrs) {
      if (!qrTokens.has(q.shipmentId)) qrTokens.set(q.shipmentId, q.token)
    }
    const wids = user.warehouseIds || []
    invByWh = await getInventoryProductsForWarehouses(user, wids)
    const wrows = await prisma.warehouse.findMany({ where: { id: { in: wids } }, select: { id: true, code: true } })
    for (const w of wrows) whCodes.set(w.id, w.code)
    schedules = await listAvailableSchedulesForWarehouses(user, wids)
  } catch {}

  return (
    <AppShell>
      <div className="py-8 px-6 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFD700' }}>Marketing Dashboard</h1>
          <p className="text-lg" style={{ color: '#b0b7c3' }}>Fokus layanan pelanggan: orders dan KPI</p>
        </div>
        {canViewSection(user, 'kpi') && (
          <UiPanel title="KPI Trend">
            <KpiTrendChart data={dailyData as any} />
          </UiPanel>
        )}

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

        {canViewSection(user, 'orders') && orders.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Orders Terbaru</h3>
            <div className="overflow-x-auto rounded-lg border border-yellow-300/20">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: '#FFD700' }}>
                    <th className="py-2 px-3">Order Code</th>
                    <th className="py-2 px-3">Customer</th>
                    <th className="py-2 px-3">Origin</th>
                    <th className="py-2 px-3">Destination</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-yellow-300/10" style={{ color: '#b0b7c3' }}>
                      <td className="py-2 px-3">{o.order_code}</td>
                      <td className="py-2 px-3">{o.customer}</td>
                      <td className="py-2 px-3">{o.origin}</td>
                      <td className="py-2 px-3">{o.destination}</td>
                      <td className="py-2 px-3">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(canViewSection(user, 'kpi') || canViewSection(user, 'shipments')) && (
          <div className="mt-8 rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Route Overview</h3>
            <form action={viewRoute} className="flex items-center gap-2 mb-4">
              <input name="routeCode" className="ui-input" placeholder={formatTokenHint('route')} />
              <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Tampilkan</button>
            </form>
            {routeDetails ? (
              <RouteOverviewPanel title="Route Overview" details={routeDetails as any} />
            ) : routeCode ? (
              <div className="rounded border border-red-500/30 bg-red-500/10 text-red-300 p-3">Route tidak ditemukan</div>
            ) : null}
          </div>
        )}

        {canViewSection(user, 'shipments') && (
          <div className="mt-8 rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Shipment Route Info</h3>
            <form action={viewShipment} className="flex items-center gap-2 mb-4">
              <input name="shipmentId" className="ui-input" placeholder={formatTokenHint('ship')} />
              <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Tampilkan</button>
            </form>
            {shipmentRouteInfo ? (
              <ShipmentRoutePanel title="Shipment Route Info" details={{ route_path: shipmentRouteInfo.route_path || [], active_leg_index: shipmentRouteInfo.current_leg_index || 0 }} routePath={shipmentRouteInfo.route_path || []} activeIndex={shipmentRouteInfo.current_leg_index || 0} keyPrefix={shipCode} />
            ) : shipCode ? (
              <div className="rounded border border-red-500/30 bg-red-500/10 text-red-300 p-3">Shipment tidak ditemukan / tidak diizinkan</div>
            ) : null}
          </div>
        )}

        {canViewSection(user, 'shipments') && (
          <div className="mt-8 rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Buat Shipment</h3>
            <form action={createShipment} className="flex flex-wrap gap-3 items-center mb-4">
              <input name="shipmentId" className="ui-input" placeholder="Shipment ID" />
              <input name="customer" className="ui-input" placeholder="Customer" />
              <input name="origin" className="ui-input" placeholder="Origin" />
              <input name="destination" className="ui-input" placeholder="Destination" />
              <select name="status" className="ui-input" defaultValue="in_transit">
                <option value="in_transit">In Transit</option>
                <option value="hold">Hold</option>
                <option value="delivered">Delivered</option>
              </select>
              <input name="formCode" className="ui-input" placeholder="Form Code" />
              <select name="scheduleId" className="ui-input">
                <option value="">Pilih Jadwal Driver/Armada (Ops)</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>{(whCodes.get(s.warehouseId) || s.warehouseId)} — {s.driver?.name || '—'} — {s.vehicle?.plateNumber || '—'} — {s.shift || ''}</option>
                ))}
              </select>
              <input name="invoiceNo" className="ui-input" placeholder="No Invoice" />
              <input name="invoiceType" className="ui-input" placeholder="Jenis Invoice" />
              <input name="invoiceAmount" className="ui-input" placeholder="Nilai Invoice" type="number" min="0" step="0.01" />
              <select name="productSel" className="ui-input">
                <option value="">Pilih Produk dari Inventory</option>
                {Array.from(Object.entries(invByWh)).map(([wid, items]) => (
                  <optgroup key={wid} label={(whCodes.get(wid) || wid)}>
                    {items.map((it) => (
                      <option key={`${wid}|${it.code}`} value={`${wid}|${it.code}`}>{it.code} — Qty: {it.qty}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input name="uom" className="ui-input" defaultValue="PCS" placeholder="UOM" />
              <input name="qtyUnit" className="ui-input" placeholder="Qty" type="number" min="0" step="0.001" />
              <WarehouseSelect name="warehouseId" warehouseIds={user.warehouseIds || []} defaultValue={(user.warehouseIds || [])[0] || ''} placeholder="Warehouse ID" placeholderLabel="Pilih Gudang" />
              <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Simpan</button>
            </form>
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3" style={{ color: '#FFD700' }}>Daftar Shipment & QR</h4>
              <div className="space-y-3">
                {shipments.map((s) => {
                  const token = qrTokens.get(s.id)
                  return (
                    <div key={s.id} className="flex items-center gap-4">
                      <div className="flex-1" style={{ color: '#b0b7c3' }}>
                        <div className="font-semibold" style={{ color: '#fff' }}>{s.shipmentId} — {s.customer}</div>
                        <div className="text-xs">{s.origin} → {s.destination}</div>
                        <div className="text-xs">Status: {s.status}</div>
                      </div>
                      {token ? (
                        <div className="flex items-center gap-3">
                          <QrTicketCard token={token} />
                          <a href={`/tracking/${encodeURIComponent(token)}`} className="ui-btn ui-btn--outline ui-pressable">Lihat</a>
                        </div>
                      ) : (
                        <div className="text-xs" style={{ color: '#b0b7c3' }}>QR belum tersedia</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
