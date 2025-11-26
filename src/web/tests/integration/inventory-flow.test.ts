import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const createdMoves: any[] = []
  return {
    prisma: {
      shipment: { findUnique: vi.fn().mockResolvedValue({ organizationId: 'ORG-1' }) },
      shipmentItem: { findMany: vi.fn().mockResolvedValue([
        { warehouseId: 'WH-1-ID', productCode: 'PRD-1', qtyUnit: 3, uom: 'PCS' },
        { warehouseId: 'WH-2-ID', productCode: 'PRD-2', qtyUnit: 2.5, uom: 'KG' },
      ]) },
      $executeRaw: vi.fn().mockResolvedValue(1),
      inventoryMove: { create: vi.fn(async ({ data }: any) => { createdMoves.push(data); return { id: 'MV-' + createdMoves.length } }) },
    },
  }
})

vi.mock('@/lib/services/shipments-service', () => {
  return {
    resolveShipmentId: vi.fn(async (s?: string) => (s ? s + '-ID' : null)),
    resolveWarehouseId: vi.fn(async (w?: string) => (w ? w + '-ID' : null)),
  }
})

import { applyScanEventToInventory } from '@/lib/services/inventory-movement-service'

describe('inventory movement mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records out movement on load_finish at specified warehouse', async () => {
    await applyScanEventToInventory({ shipmentId: 'SHP-1', warehouseId: 'WH-1', eventType: 'load_finish' })
    const { prisma } = await import('@/lib/prisma') as any
    const moves = (prisma.inventoryMove.create as any).mock.calls.map((c: any[]) => c[0].data)
    expect(moves.some((m: any) => m.direction === 'out' && m.warehouseId === 'WH-1-ID')).toBe(true)
  })

  it('records out movement on scan transfer at specified warehouse', async () => {
    await applyScanEventToInventory({ shipmentId: 'SHP-1', warehouseId: 'WH-2', eventType: 'scan', refType: 'transfer' })
    const { prisma } = await import('@/lib/prisma') as any
    const moves = (prisma.inventoryMove.create as any).mock.calls.map((c: any[]) => c[0].data)
    expect(moves.some((m: any) => m.direction === 'out' && m.warehouseId === 'WH-2-ID' && m.eventType === 'scan')).toBe(true)
  })

  it('records in movement on gate_in at specified warehouse', async () => {
    await applyScanEventToInventory({ shipmentId: 'SHP-1', warehouseId: 'WH-1', eventType: 'gate_in' })
    const { prisma } = await import('@/lib/prisma') as any
    const moves = (prisma.inventoryMove.create as any).mock.calls.map((c: any[]) => c[0].data)
    expect(moves.some((m: any) => m.direction === 'in' && m.warehouseId === 'WH-1-ID')).toBe(true)
  })
})

