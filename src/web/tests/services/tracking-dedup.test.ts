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

describe('tracking-service dedup timeline driver', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('dedup memilih event terbaru per eventType+shipmentId', async () => {
    ;(prisma.qrTicket.findFirst as any).mockResolvedValue({ id: 'QR-1', token: 'DRV-QR-1', shipmentId: 'SHIP-1', shipment: { customer: 'ACME', origin: 'A', destination: 'B' } })
    const base = Date.now()
    const rows = [
      { id: 'E1', eventType: 'gate_in', createdAt: new Date(base - 1000), warehouseId: 'WH-A', organizationId: 'ORG-1', shipmentId: 'SHIP-1', formCode: 'FORM-X' },
      { id: 'E2', eventType: 'gate_in', createdAt: new Date(base + 1000), warehouseId: 'WH-A', organizationId: 'ORG-1', shipmentId: 'SHIP-1', formCode: 'FORM-X' },
      { id: 'E3', eventType: 'gate_out', createdAt: new Date(base + 2000), warehouseId: 'WH-A', organizationId: 'ORG-1', shipmentId: 'SHIP-1', formCode: 'FORM-X' },
    ]
    ;(prisma.scanEvent.findMany as any).mockResolvedValue(rows)
    const tl = await getTrackingTimeline('DRV-QR-1')
    expect(tl?.events.map(e => e.event_type)).toEqual(['gate_in','gate_out'])
  })
})

