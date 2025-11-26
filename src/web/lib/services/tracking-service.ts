import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export type TrackingEventStatus = 'completed' | 'in_progress' | 'pending'
export type TrackingEventType = 'gate_in' | 'load_start' | 'load_finish' | 'gate_out' | 'pod' | 'scan'

export interface TrackingEventItem {
  id: string
  event_type: TrackingEventType
  event_time: string
  location: string
  description: string
  status: TrackingEventStatus
}

export interface TrackingTimeline {
  token: string
  shipment_id: string | null
  customer_name: string | null
  origin: string | null
  destination: string | null
  status: string
  events: TrackingEventItem[]
  estimated_delivery: string | null
}

/**
 * Urutan siklus event operasional (digunakan untuk menghitung status per event):
 * - gate_in: Security/Gate menandai kendaraan masuk
 * - load_start: Ops/Warehouse mulai proses muat
 * - load_finish: Ops/Warehouse selesai muat
 * - gate_out: Security/Gate menandai kendaraan keluar
 * - pod: Driver/Operator menyerahkan Proof of Delivery (menandai Delivered)
 * - scan: IoT/manual scan di checkpoint (opsional, setelah atau di tengah siklus)
 */
const ORDER: TrackingEventType[] = ['gate_in', 'load_start', 'load_finish', 'gate_out', 'pod', 'scan']

type PayloadShape = {
  location?: string
  description?: string
  eta?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getPayloadString(payload: Prisma.JsonValue | null | undefined, key: keyof PayloadShape): string | null {
  if (!payload || !isRecord(payload)) return null
  const v = payload[key]
  return typeof v === 'string' && v.trim().length > 0 ? v : null
}

/**
 * Mapping status visual di timeline:
 * - completed: semua event yang terjadi sebelum event terakhir
 * - in_progress: event terakhir yang sedang berlangsung
 * - pending: event yang belum terjadi (setelah event terakhir)
 */
export function computeStatuses(types: TrackingEventType[], lastType: TrackingEventType | null): TrackingEventStatus[] {
  return types.map((t) => {
    if (!lastType) return 'pending'
    const idx = ORDER.indexOf(t)
    const lastIdx = ORDER.indexOf(lastType)
    if (idx < 0 || lastIdx < 0) return 'pending'
    if (idx < lastIdx) return 'completed'
    if (idx === lastIdx) return 'in_progress'
    return 'pending'
  })
}

// Deduplikasi Timeline Driver:
// - Key dedup: eventType + shipmentId (fallback formCode bila shipmentId kosong)
// - Last writer wins: pilih event dengan waktu paling baru (ts jika ada, else createdAt)
// - Dilakukan di layer baca saja, tidak mengubah baris scan_event (audit trail tetap utuh)
function normalizeTs(row: any): Date {
  return (row?.ts ?? row?.createdAt) as Date
}

// Perbedaan alur:
// - Timeline Driver menggunakan hasil dedup ini
// - KPI Admin/Marketing menghitung semua raw event (lihat analytics-service)
function deduplicateScanEvents(rows: any[]): any[] {
  const latestByKey = new Map<string, any>()
  for (const r of rows) {
    const key = `${r.eventType}|${r.shipmentId ?? r.formCode ?? ''}`
    const cur = latestByKey.get(key)
    if (!cur) {
      latestByKey.set(key, r)
      continue
    }
    const a = normalizeTs(cur).getTime()
    const b = normalizeTs(r).getTime()
    if (b >= a) latestByKey.set(key, r)
  }
  const deduped = Array.from(latestByKey.values())
  deduped.sort((x, y) => normalizeTs(x).getTime() - normalizeTs(y).getTime())
  return deduped
}

export async function getTrackingTimeline(token: string): Promise<TrackingTimeline | null> {
  let qr: any = null
  try {
    qr = await (prisma as any).qrTicket.findFirst({ where: { token }, include: { shipment: true } })
  } catch {}

  if (qr) {
    let rows: any[] = []
    try {
      rows = await prisma.scanEvent.findMany({
        where: { OR: [{ qrTicketId: qr.id }, { shipmentId: qr.shipmentId }] },
        orderBy: { createdAt: 'asc' },
      })
    } catch {}
    rows = deduplicateScanEvents(rows)
    // Security/Ops events (gate_in/gate_out, load_start/load_finish) + Driver pod → timeline & KPI
    if (!rows.length && token === 'FORM-OPS-001') {
      const now = Date.now()
      const mock = [
        { id: 'M1', eventType: 'gate_in', ts: new Date(now - 1000 * 60 * 60 * 24), payload: { location: 'Surabaya', description: 'Kendaraan masuk gerbang' }, warehouseId: 'WH-SBY', refType: 'Gate' },
        { id: 'M2', eventType: 'load_start', ts: new Date(now - 1000 * 60 * 60 * 20), payload: { location: 'Gudang SBY', description: 'Mulai muat' }, warehouseId: 'WH-SBY', refType: 'Ops' },
        { id: 'M3', eventType: 'scan', ts: new Date(now - 1000 * 60 * 60 * 2), payload: { location: 'Checkpoint Cirebon', description: 'Checkpoint Cirebon', eta: new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10) }, warehouseId: 'WH-CRB', refType: 'Scan' },
      ]
      const last = mock[mock.length - 1]
      const lastType = last.eventType as TrackingEventType
      const statuses = computeStatuses(mock.map((f) => f.eventType as TrackingEventType), lastType)
      const events: TrackingEventItem[] = mock.map((f, i) => ({
        id: f.id,
        event_type: f.eventType as TrackingEventType,
        event_time: (f.ts as Date).toISOString(),
        location: getPayloadString(f.payload as unknown as Prisma.JsonValue, 'location') ?? f.warehouseId ?? '—',
        description: getPayloadString(f.payload as unknown as Prisma.JsonValue, 'description') ?? f.refType ?? '—',
        status: statuses[i],
      }))
      const estimated = getPayloadString(last.payload as unknown as Prisma.JsonValue, 'eta')
      return {
        token,
        shipment_id: qr.shipmentId ?? 'SHIP-OPS-001',
        customer_name: qr.shipment ? qr.shipment.customer : 'PT Demo Logistik',
        origin: qr.shipment ? qr.shipment.origin : 'Surabaya',
        destination: qr.shipment ? qr.shipment.destination : 'Jakarta',
        status: 'In Transit',
        events,
        estimated_delivery: estimated ?? null,
      }
    }
    const last = rows[rows.length - 1] || null
    const lastType = last ? (last.eventType as TrackingEventType) : null
    const statuses = computeStatuses(rows.map((f) => f.eventType as TrackingEventType), lastType)
    const events: TrackingEventItem[] = rows.map((f, i) => ({
      id: f.id,
      event_type: f.eventType as TrackingEventType,
      event_time: (f.ts ?? f.createdAt).toISOString(),
      location: getPayloadString(f.payload as Prisma.JsonValue, 'location') ?? f.warehouseId ?? '—',
      description: getPayloadString(f.payload as Prisma.JsonValue, 'description') ?? f.refType ?? '—',
      status: statuses[i],
    }))
    const status = lastType === 'pod' ? 'Delivered' : rows.length ? 'In Transit' : 'In Transit'
    const estimated = last ? getPayloadString(last.payload as Prisma.JsonValue, 'eta') : null
    return {
      token,
      shipment_id: qr.shipmentId ?? null,
      customer_name: qr.shipment ? qr.shipment.customer : null,
      origin: qr.shipment ? qr.shipment.origin : null,
      destination: qr.shipment ? qr.shipment.destination : null,
      status,
      events,
      estimated_delivery: estimated ?? null,
    }
  }

  let rows: any[] = []
  try {
    rows = await prisma.scanEvent.findMany({
      where: { OR: [{ shipmentId: token }, { formCode: token }] },
      orderBy: { createdAt: 'asc' },
    })
  } catch {}
  rows = deduplicateScanEvents(rows)
  if (!rows.length) {
    if (token === 'FORM-OPS-001') {
      const now = Date.now()
      const mock = [
        { id: 'M1', eventType: 'gate_in', ts: new Date(now - 1000 * 60 * 60 * 24), payload: { location: 'Surabaya', description: 'Kendaraan masuk gerbang' }, warehouseId: 'WH-SBY', refType: 'Gate' },
        { id: 'M2', eventType: 'load_start', ts: new Date(now - 1000 * 60 * 60 * 20), payload: { location: 'Gudang SBY', description: 'Mulai muat' }, warehouseId: 'WH-SBY', refType: 'Ops' },
        { id: 'M3', eventType: 'scan', ts: new Date(now - 1000 * 60 * 60 * 2), payload: { location: 'Checkpoint Cirebon', description: 'Checkpoint Cirebon', eta: new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10) }, warehouseId: 'WH-CRB', refType: 'Scan' },
      ]
      const last = mock[mock.length - 1]
      const lastType = last.eventType as TrackingEventType
      const statuses = computeStatuses(mock.map((f) => f.eventType as TrackingEventType), lastType)
      const events: TrackingEventItem[] = mock.map((f, i) => ({
        id: f.id,
        event_type: f.eventType as TrackingEventType,
        event_time: (f.ts as Date).toISOString(),
        location: getPayloadString(f.payload as unknown as Prisma.JsonValue, 'location') ?? f.warehouseId ?? '—',
        description: getPayloadString(f.payload as unknown as Prisma.JsonValue, 'description') ?? f.refType ?? '—',
        status: statuses[i],
      }))
      const estimated = getPayloadString(last.payload as unknown as Prisma.JsonValue, 'eta')
      return {
        token,
        shipment_id: 'SHIP-OPS-001',
        customer_name: 'PT Demo Logistik',
        origin: 'Surabaya',
        destination: 'Jakarta',
        status: 'In Transit',
        events,
        estimated_delivery: estimated ?? null,
      }
    }
    return null
  }
  const last = rows[rows.length - 1]
  const lastType = (last.eventType as TrackingEventType) || null
  const statuses = computeStatuses(rows.map((f) => f.eventType as TrackingEventType), lastType)
  const events: TrackingEventItem[] = rows.map((f, i) => ({
    id: f.id,
    event_type: f.eventType as TrackingEventType,
    event_time: (f.ts ?? f.createdAt).toISOString(),
    location: getPayloadString(f.payload as Prisma.JsonValue, 'location') ?? f.warehouseId ?? '—',
    description: getPayloadString(f.payload as Prisma.JsonValue, 'description') ?? f.refType ?? '—',
    status: statuses[i],
  }))
  const status = lastType === 'pod' ? 'Delivered' : 'In Transit'
  const estimated = getPayloadString(last.payload as Prisma.JsonValue, 'eta')
  return {
    token,
    shipment_id: last.shipmentId ?? null,
    customer_name: null,
    origin: null,
    destination: null,
    status,
    events,
    estimated_delivery: estimated ?? null,
  }
}
