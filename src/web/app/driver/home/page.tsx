import React from 'react'
import AppShell from '@/components/layout/app-shell'
import { getServerUserContext, requireRole } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'
import { getTrackingTimeline } from '@/lib/services/tracking-service'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getShipmentRouteInfoForDriver } from '@/lib/services/shipments-service'
import { computeStopBadges } from '@/lib/ui/route-badges'
import ShipmentRoutePanel from '@/components/ui/shipment-route-panel'
import ShipmentRouteBadgesPanel from '@/components/ui/shipment-route-badges-panel'

export const dynamic = 'force-dynamic'

async function selectActiveDriverToken(user: { orgId: string; warehouseIds: string[] }) {
  // Pemilihan token sesuai multi-tenant: orgId wajib, gudang opsional
  const wids = user.warehouseIds || []
  const where: any = { organizationId: user.orgId, status: 'active' }
  if (wids.length) {
    where.OR = [
      { warehouseId: { in: wids } },
      { shipment: { is: { origin: { in: wids } } } },
      { shipment: { is: { destination: { in: wids } } } },
    ]
  }
  try {
    const ticket = await prisma.qrTicket.findFirst({ where, orderBy: { createdAt: 'desc' } })
    return ticket?.token || 'FORM-OPS-001'
  } catch {
    return 'FORM-OPS-001'
  }
}

export default async function DriverHomePage({ searchParams }: { searchParams?: { ok?: string; error?: string } }) {
  const user = await getServerUserContext()
  if (!user) redirect('/login')
  if (!requireRole(user, ['driver'])) redirect('/dashboard')

  // Ambil token aktif driver → fallback aman bila tidak ada tiket
  const token = await selectActiveDriverToken({ orgId: user.orgId!, warehouseIds: user.warehouseIds || [] })
  // Panggil tracking timeline berdasarkan token (relasi qr_ticket → shipment → scan_event)
  const timeline = await getTrackingTimeline(token)

  let routeInfo: { route_path: string[]; current_leg_index: number } | null = null
  if (timeline?.shipment_id) {
    try {
      routeInfo = await getShipmentRouteInfoForDriver(user as any, timeline.shipment_id)
    } catch {}
  }

  const computeBadges = (routePath: string[], activeIndex: number) => computeStopBadges(routePath, activeIndex)

  async function startGps() {
    'use server'
    const ck = cookies()
    ck.set('gps_tracking', '1', { httpOnly: true, path: '/', sameSite: 'lax' })
  }

  async function stopGps() {
    'use server'
    const ck = cookies()
    ck.set('gps_tracking', '0', { httpOnly: true, path: '/', sameSite: 'lax' })
  }

  async function sendPing(formData: FormData) {
    'use server'
    const lat = Number(formData.get('lat') || '0')
    const lng = Number(formData.get('lng') || '0')
    const speed = Number(formData.get('speed') || '')
    const body: any = { lat, lng }
    if (!Number.isNaN(speed)) body.speed = speed
    body.qrTicketId = null
    body.shipmentId = timeline?.shipment_id || null
    await fetch('/api/driver/gps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gps-token': process.env.GPS_WRITE_TOKEN || '' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  }

  async function submitPod(formData: FormData) {
    'use server'
    const formCode = String(formData.get('formCode') || 'FORM-OPS-001')
    const shipmentId = String(formData.get('shipmentId') || (timeline?.shipment_id || ''))
    const widDefault = (routeInfo?.route_path || [])[routeInfo?.current_leg_index || 0] || ''
    const warehouseId = String(formData.get('warehouseId') || widDefault)
    const idem = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const body = {
      formCode,
      shipmentId: shipmentId || undefined,
      warehouseId: warehouseId || undefined,
      eventType: 'pod',
      payload: { idempotency_key: idem, source: 'driver' },
      userEmail: user.email,
      idempotencyKey: idem,
    }
    try {
      const res = await fetch('/api/driver/pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-scan-token': process.env.SCAN_WRITE_TOKEN || '' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (!res.ok) redirect('/driver/home?error=1')
      redirect('/driver/home?ok=1')
    } catch {
      redirect('/driver/home?error=1')
    }
  }

  return (
    <AppShell>
      <div className="py-8 px-6 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFD700' }}>Dashboard Driver</h1>
          <p className="text-lg" style={{ color: '#b0b7c3' }}>Rute aktif dan histori singkat pengiriman hari ini</p>
        </div>

        {/* Interpretasi hasil ke UI driver */}
        {!timeline ? (
          <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6" style={{ color: '#b0b7c3' }}>
          Tidak ada timeline yang aktif untuk token {token}
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>Tracking: {timeline.shipment_id}</h3>
            <div className="space-y-3 text-sm" style={{ color: '#b0b7c3' }}>
              <div>Status: {timeline.status}</div>
              <div>Origin: {timeline.origin ?? '—'} → Destination: {timeline.destination ?? '—'}</div>
              <div>ETA: {timeline.estimated_delivery ?? '—'}</div>
            </div>
            {routeInfo && (
              <div className="mt-6">
                <ShipmentRoutePanel title="Ringkasan Rute" details={{ route_path: routeInfo.route_path || [], active_leg_index: routeInfo.current_leg_index || 0 }} routePath={routeInfo.route_path || []} activeIndex={routeInfo.current_leg_index || 0} keyPrefix={timeline.shipment_id || ''} />
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2" style={{ color: '#FFD700' }}>Stop Berikutnya</h4>
                  <ul className="space-y-1 text-sm" style={{ color: '#b0b7c3' }}>
                    {computeBadges(routeInfo.route_path || [], routeInfo.current_leg_index || 0).filter((b) => b.status==='pending').map((b) => (
                      <li key={`pending-${b.warehouseId}`}>{b.warehouseId}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="mt-4">
              <ul className="space-y-2">
                {timeline.events.map((e) => (
                  <li key={e.id} className="rounded border border-yellow-500/20 p-3" style={{ color: '#b0b7c3' }}>
                    <div className="text-yellow-300">{e.event_type.toUpperCase()}</div>
                    <div className="text-xs">{new Date(e.event_time).toLocaleString()}</div>
                    <div>{e.location} — {e.description}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 grid gap-3">
              <form action={startGps} className="flex gap-2">
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Start GPS</button>
              </form>
              <form action={stopGps} className="flex gap-2">
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Stop GPS</button>
              </form>
              <form action={sendPing} className="flex flex-wrap items-center gap-2">
                <input name="lat" placeholder="Lat" className="ui-input" />
                <input name="lng" placeholder="Lng" className="ui-input" />
                <input name="speed" placeholder="Speed (opsional)" className="ui-input" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Send Ping</button>
              </form>
              <form action={submitPod} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="eventType" value="pod" />
                <input name="formCode" defaultValue="FORM-OPS-001" className="ui-input" placeholder="Form Code" />
                <input name="shipmentId" defaultValue={timeline?.shipment_id || ''} className="ui-input" placeholder="Shipment ID" />
                <input name="warehouseId" defaultValue={(routeInfo?.route_path || [])[routeInfo?.current_leg_index || 0] || ''} className="ui-input" placeholder="Warehouse ID" />
                <button type="submit" className="ui-btn ui-btn--outline ui-pressable">Submit POD</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
