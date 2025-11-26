import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      shipment: { findFirst: vi.fn() },
      $executeRaw: vi.fn(),
    },
  }
})

import { prisma } from '@/lib/prisma'
import { maybeAdvanceShipmentLeg } from '@/lib/services/multi-warehouse-service'

describe('multi-warehouse-service.maybeAdvanceShipmentLeg', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('A→B→C: gate_in at B advances index from 0 to 1', async () => {
    ;(prisma as any).shipment.findFirst.mockResolvedValue({ routePath: ['WH-A','WH-B','WH-C'], currentLegIndex: 0 })
    await maybeAdvanceShipmentLeg({ shipmentId: 'SHP-ABC', warehouseId: 'WH-B', eventType: 'gate_in' })
    expect(prisma.$executeRaw).toHaveBeenCalled()
  })

  it('A→B→C: gate_in at C advances index from 1 to 2', async () => {
    ;(prisma as any).shipment.findFirst.mockResolvedValue({ routePath: ['WH-A','WH-B','WH-C'], currentLegIndex: 1 })
    await maybeAdvanceShipmentLeg({ shipmentId: 'SHP-ABC', warehouseId: 'WH-C', eventType: 'gate_in' })
    expect((prisma.$executeRaw as any).mock.calls.length).toBe(1)
  })

  it('gate_out does not advance index', async () => {
    ;(prisma as any).shipment.findFirst.mockResolvedValue({ routePath: ['WH-A','WH-B'], currentLegIndex: 0 })
    await maybeAdvanceShipmentLeg({ shipmentId: 'SHP-AB', warehouseId: 'WH-A', eventType: 'gate_out' })
    expect((prisma.$executeRaw as any).mock.calls.length).toBe(0)
  })
})
