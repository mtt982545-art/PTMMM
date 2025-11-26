import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      scanEvent: { findMany: vi.fn() },
    },
  }
})

import { prisma } from '@/lib/prisma'
import { getTrackingTimeline, type TrackingEventType } from '@/lib/services/tracking-service'

function makeEvent(id: string, eventType: TrackingEventType, payload?: any, overrides?: any) {
  const now = new Date('2024-01-01T00:00:00Z')
  return {
    id,
    formCode: 'FORM-OPS-001',
    shipmentId: 'DEMO-TRACK-001',
    warehouseId: 'GATE-SBY',
    eventType,
    refType: 'ops',
    payload: payload ?? {},
    userEmail: 'ops@ptmmm.co',
    ts: null,
    createdAt: now,
    ...overrides,
  }
}

describe('tracking-service.getTrackingTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Skenario bisnis: token DEMO-TRACK-001 merepresentasikan shipment dengan siklus lengkap
  // gate_in → load_start → load_finish → gate_out → pod
  it('mengembalikan timeline lengkap untuk token valid dengan status Delivered (last=pod)', async () => {
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([
      makeEvent('E1','gate_in',{ location: 'Surabaya', description: 'Kendaraan masuk gerbang' }),
      makeEvent('E2','load_start',{ location: 'Gudang SBY', description: 'Mulai muat' }),
      makeEvent('E3','load_finish',{ location: 'Gudang SBY', description: 'Selesai muat' }),
      makeEvent('E4','gate_out',{ location: 'Surabaya', description: 'Keluar gerbang' }),
      makeEvent('E5','pod',{ location: 'Jakarta', description: 'Proof of Delivery', eta: '2024-01-05' }),
    ])

    const tl = await getTrackingTimeline('DEMO-TRACK-001')
    expect(tl).toBeTruthy()
    expect(tl?.status).toBe('Delivered')
    expect(tl?.events.length).toBe(5)
    expect(tl?.events.map(e => e.status)).toEqual(['completed','completed','completed','completed','in_progress'])
    expect(tl?.estimated_delivery).toBe('2024-01-05')
  })

  // Skenario bisnis: token FORM-OPS-001 merepresentasikan form operasional dengan event terakhir bukan pod
  // Status akhir harus In Transit
  it('status akhir In Transit bila last event bukan pod (mis. scan)', async () => {
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([
      makeEvent('E1','gate_in', { location: 'Surabaya' }),
      makeEvent('E2','load_start'),
      makeEvent('E3','scan', { description: 'Checkpoint Cirebon' }),
    ])

    const tl = await getTrackingTimeline('FORM-OPS-001')
    expect(tl).toBeTruthy()
    expect(tl?.status).toBe('In Transit')
    expect(tl?.events.map(e => e.event_type)).toEqual(['gate_in','load_start','scan'])
  })

  // Default aman untuk payload kosong: location/description '—', estimated_delivery null
  it('default values aman saat payload tidak mengandung field yang diharapkan', async () => {
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([
      makeEvent('E1','gate_in', undefined, { warehouseId: null, refType: null }),
    ])
    const tl = await getTrackingTimeline('DEMO-TRACK-001')
    expect(tl).toBeTruthy()
    expect(tl?.events[0].location).toBe('—')
    expect(tl?.events[0].description).toBe('—')
    expect(tl?.estimated_delivery).toBeNull()
  })

  // Token tidak ditemukan → null (API akan mengubah menjadi 404 { ok: false, message: 'Not found' })
  it('token tidak ditemukan mengembalikan null', async () => {
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([])
    const tl = await getTrackingTimeline('UNKNOWN')
    expect(tl).toBeNull()
  })

  it('status event dihitung benar saat last=load_finish', async () => {
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([
      makeEvent('E1','gate_in'),
      makeEvent('E2','load_start'),
      makeEvent('E3','load_finish'),
    ])

    const tl = await getTrackingTimeline('FORM-OPS-001')
    expect(tl).toBeTruthy()
    expect(tl?.events.map(e => e.status)).toEqual(['completed','completed','in_progress'])
    expect(tl?.status).toBe('In Transit')
  })

  it('status event dihitung benar saat last=gate_out', async () => {
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([
      makeEvent('E1','gate_in'),
      makeEvent('E2','load_start'),
      makeEvent('E3','load_finish'),
      makeEvent('E4','gate_out'),
    ])

    const tl = await getTrackingTimeline('FORM-OPS-001')
    expect(tl).toBeTruthy()
    expect(tl?.events.map(e => e.status)).toEqual(['completed','completed','completed','in_progress'])
    expect(tl?.status).toBe('In Transit')
  })

  it('should deduplicate concurrent scans: pilih event terbaru per type+shipment', async () => {
    const base = new Date('2024-01-01T00:00:00Z')
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([
      makeEvent('E1','gate_in', { location: 'Surabaya' }, { createdAt: new Date(base) }),
      makeEvent('E2A','load_start', { description: 'Ops start' }, { createdAt: new Date('2024-01-01T00:02:00Z') }),
      makeEvent('E2B','load_start', { description: 'Security confirm' }, { createdAt: new Date('2024-01-01T00:05:00Z') }),
      makeEvent('E3','scan', { description: 'Checkpoint 1' }, { createdAt: new Date('2024-01-01T00:10:00Z') }),
    ])

    const tl = await getTrackingTimeline('DEMO-TRACK-001')
    expect(tl).toBeTruthy()
    expect(tl?.events.map(e => e.event_type)).toEqual(['gate_in','load_start','scan'])
    const ls = tl?.events.find(e => e.event_type === 'load_start')
    expect(ls?.id).toBe('E2B')
    expect(tl?.events.map(e => e.status)).toEqual(['completed','completed','in_progress'])
  })
})
