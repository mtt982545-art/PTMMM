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
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'

describe('integrasi lintas peran: Security/Ops → Driver → Analytics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rangkaian event gate_in → load_start → load_finish → gate_out → pod terlihat di driver timeline & analytics', async () => {
    ;(prisma.qrTicket.findFirst as any).mockResolvedValue({ id: 'QR-9', token: 'DRV-QR-9', shipmentId: 'SHIP-9', shipment: { customer: 'ACME', origin: 'WH-A', destination: 'WH-B' } })
    const base = Date.now() - 3600 * 1000
    const rows = [
      { id: 'E1', eventType: 'gate_in', createdAt: new Date(base + 1), warehouseId: 'WH-A', organizationId: 'ORG-1' },
      { id: 'E2', eventType: 'load_start', createdAt: new Date(base + 2), warehouseId: 'WH-A', organizationId: 'ORG-1' },
      { id: 'E3', eventType: 'load_finish', createdAt: new Date(base + 3), warehouseId: 'WH-A', organizationId: 'ORG-1' },
      { id: 'E4', eventType: 'gate_out', createdAt: new Date(base + 4), warehouseId: 'WH-A', organizationId: 'ORG-1' },
      { id: 'E5', eventType: 'pod', createdAt: new Date(base + 5), warehouseId: 'WH-B', organizationId: 'ORG-1' },
    ]
    ;(prisma.scanEvent.findMany as any).mockResolvedValue(rows)

    const tl = await getTrackingTimeline('DRV-QR-9')
    expect(tl?.status).toBe('Delivered')
    expect(tl?.events.map(e => e.event_type)).toEqual(['gate_in','load_start','load_finish','gate_out','pod'])

    const { kpi } = await getAnalyticsOverviewForUser({ id: 'U', email: 'admin@ptmmm.co', role: 'admin', orgId: 'ORG-1', warehouseIds: ['WH-A','WH-B'], sectionsAllowed: ['kpi','events','orders','shipments','reports'] })
    expect(kpi.gate_in).toBeGreaterThanOrEqual(1)
    expect(kpi.load_start).toBeGreaterThanOrEqual(1)
    expect(kpi.load_finish).toBeGreaterThanOrEqual(1)
    expect(kpi.gate_out).toBeGreaterThanOrEqual(1)
  })
})

