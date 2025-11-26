import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      qrTicket: { findFirst: vi.fn() },
      scanEvent: { findMany: vi.fn() },
    },
  }
})

import { prisma } from '@/lib/prisma'
import { getTrackingTimeline } from '@/lib/services/tracking-service'

describe('alur driver + tracking melalui QrTicket token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengambil timeline berdasarkan token QrTicket dan shipment terkait', async () => {
    ;(prisma.qrTicket.findFirst as any).mockResolvedValue({
      id: 'QR-1',
      token: 'DRV-QR-1',
      shipmentId: 'SHIP-42',
      shipment: { customer: 'PT Pelanggan', origin: 'Surabaya', destination: 'Jakarta' },
    })
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([
      { id: 'E1', eventType: 'gate_in', createdAt: new Date('2024-01-01T01:00:00Z'), payload: { location: 'Surabaya', description: 'Masuk gerbang' }, warehouseId: 'WH-SBY', refType: 'Gate' },
      { id: 'E2', eventType: 'load_start', createdAt: new Date('2024-01-01T02:00:00Z'), payload: { location: 'Gudang SBY' }, warehouseId: 'WH-SBY', refType: 'Ops' },
    ])

    const tl = await getTrackingTimeline('DRV-QR-1')
    expect(tl).toBeTruthy()
    expect(tl?.shipment_id).toBe('SHIP-42')
    expect(tl?.customer_name).toBe('PT Pelanggan')
    expect(tl?.origin).toBe('Surabaya')
    expect(tl?.destination).toBe('Jakarta')
    expect(tl?.events.length).toBe(2)
  })

  it('fallback saat tidak ada tiket aktif (gunakan FORM-OPS-001)', async () => {
    ;(prisma.qrTicket.findFirst as any).mockResolvedValue(null)
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([])
    const tl = await getTrackingTimeline('FORM-OPS-001')
    expect(tl).toBeTruthy()
    expect(tl?.status).toBe('In Transit')
    expect(tl?.events.length).toBeGreaterThan(0)
  })

  it('urut dan status event konsisten (completed/in_progress/pending)', async () => {
    ;(prisma.qrTicket.findFirst as any).mockResolvedValue({ id: 'QR-2', token: 'DRV-QR-2', shipmentId: 'SHIP-99', shipment: null })
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([
      { id: 'E1', eventType: 'gate_in', createdAt: new Date('2024-01-01T01:00:00Z'), payload: {}, warehouseId: 'WH-1', refType: 'Gate' },
      { id: 'E2', eventType: 'load_start', createdAt: new Date('2024-01-01T02:00:00Z'), payload: {}, warehouseId: 'WH-1', refType: 'Ops' },
      { id: 'E3', eventType: 'pod', createdAt: new Date('2024-01-01T03:00:00Z'), payload: {}, warehouseId: 'WH-2', refType: 'Driver' },
    ])
    const tl = await getTrackingTimeline('DRV-QR-2')
    expect(tl?.status).toBe('Delivered')
    expect(tl?.events.map(e => e.event_type)).toEqual(['gate_in','load_start','pod'])
    expect(tl?.events.map(e => e.status)).toEqual(['completed','completed','in_progress'])
  })
})
