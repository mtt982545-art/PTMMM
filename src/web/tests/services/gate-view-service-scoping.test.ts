import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      qrTicket: { findFirst: vi.fn() },
      $queryRaw: vi.fn(),
      shipment: { findUnique: vi.fn() },
      shipmentItem: { findMany: vi.fn() },
      document: { findMany: vi.fn() },
      routeSchedule: { findUnique: vi.fn() },
      driverProfile: { findUnique: vi.fn() },
      vehicle: { findUnique: vi.fn() },
    },
  }
})

import { prisma } from '@/lib/prisma'
import { getGateViewByShipmentOrToken } from '@/lib/services/gate-view-service'

describe('gate-view-service scoping', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns data when org/warehouse match user context', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ id: 'INT-1' }])
    ;(prisma.shipment.findUnique as any).mockResolvedValue({ shipmentId: 'SHP-1', origin: 'A', destination: 'B', organizationId: 'ORG-1', warehouseId: 'WH-A' })
    ;(prisma.shipmentItem.findMany as any).mockResolvedValue([])
    ;((prisma as any).document.findMany as any).mockResolvedValue([])
    const ctx = { id: 'U', email: 'sec@ptmmm.co', role: 'security', orgId: 'ORG-1', warehouseIds: ['WH-A'], sectionsAllowed: ['events'] } as any
    const res = await getGateViewByShipmentOrToken({ shipmentId: 'SHP-1' }, ctx)
    expect(res).toBeTruthy()
    expect(res?.shipment?.shipmentId).toBe('SHP-1')
  })

  it('returns null when org mismatch', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ id: 'INT-1' }])
    ;(prisma.shipment.findUnique as any).mockResolvedValue({ shipmentId: 'SHP-1', origin: 'A', destination: 'B', organizationId: 'ORG-2', warehouseId: 'WH-A' })
    const ctx = { id: 'U', email: 'sec@ptmmm.co', role: 'security', orgId: 'ORG-1', warehouseIds: ['WH-A'], sectionsAllowed: ['events'] } as any
    const res = await getGateViewByShipmentOrToken({ shipmentId: 'SHP-1' }, ctx)
    expect(res).toBeNull()
  })

  it('returns null when warehouse mismatch and user has wh scope', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ id: 'INT-1' }])
    ;(prisma.shipment.findUnique as any).mockResolvedValue({ shipmentId: 'SHP-1', origin: 'A', destination: 'B', organizationId: 'ORG-1', warehouseId: 'WH-X' })
    const ctx = { id: 'U', email: 'sec@ptmmm.co', role: 'security', orgId: 'ORG-1', warehouseIds: ['WH-A'], sectionsAllowed: ['events'] } as any
    const res = await getGateViewByShipmentOrToken({ shipmentId: 'SHP-1' }, ctx)
    expect(res).toBeNull()
  })
})
