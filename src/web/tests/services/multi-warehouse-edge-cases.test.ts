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

describe('multi-warehouse-service edge cases', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('route_path kosong: index di-normalisasi ke 0 tanpa advance', async () => {
    ;(prisma as any).shipment.findFirst.mockResolvedValue({ routePath: [], currentLegIndex: 5 })
    await maybeAdvanceShipmentLeg({ shipmentId: 'SHP-EMPTY', warehouseId: 'WH-X', eventType: 'gate_in' })
    expect((prisma.$executeRaw as any).mock.calls.length).toBe(1)
  })

  it('route_path satu gudang: index di-normalisasi ke 0 dan tidak advance', async () => {
    ;(prisma as any).shipment.findFirst.mockResolvedValue({ routePath: ['WH-A'], currentLegIndex: 1 })
    await maybeAdvanceShipmentLeg({ shipmentId: 'SHP-ONE', warehouseId: 'WH-A', eventType: 'gate_in' })
    expect((prisma.$executeRaw as any).mock.calls.length).toBe(1)
  })

  it('scan tanpa shipmentId: tidak ada update', async () => {
    ;(prisma as any).shipment.findFirst.mockResolvedValue({ routePath: ['WH-A','WH-B'], currentLegIndex: 0 })
    await maybeAdvanceShipmentLeg({ shipmentId: null, warehouseId: 'WH-B', eventType: 'gate_in' })
    expect((prisma.$executeRaw as any).mock.calls.length).toBe(0)
  })

  it('scan tanpa warehouseId: hanya normalisasi indeks jika perlu', async () => {
    ;(prisma as any).shipment.findFirst.mockResolvedValue({ routePath: ['WH-A','WH-B'], currentLegIndex: -1 })
    await maybeAdvanceShipmentLeg({ shipmentId: 'SHP-CLAMP', warehouseId: null, eventType: 'gate_in' })
    expect((prisma.$executeRaw as any).mock.calls.length).toBe(1)
  })

  it('urutan scan melompati gudang: tidak advance', async () => {
    ;(prisma as any).shipment.findFirst.mockResolvedValue({ routePath: ['WH-A','WH-B','WH-C'], currentLegIndex: 0 })
    await maybeAdvanceShipmentLeg({ shipmentId: 'SHP-JUMP', warehouseId: 'WH-C', eventType: 'gate_in' })
    expect((prisma.$executeRaw as any).mock.calls.length).toBe(0)
  })
})

