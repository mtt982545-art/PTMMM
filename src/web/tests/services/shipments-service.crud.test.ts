import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return { prisma: { $executeRaw: vi.fn(), $queryRaw: vi.fn() } }
})

import { prisma } from '@/lib/prisma'
import { createShipment, getShipmentById, updateShipment, deleteShipment } from '@/lib/services/shipments-service'

describe('shipments-service CRUD', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('createShipment inserts and returns id', async () => {
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    ;(prisma.$queryRaw as any).mockResolvedValue([{ id: 'SHP-1' }])
    const res = await createShipment({ shipment_id: 'SHP-1', customer: 'PT AAA', origin: 'SBY', destination: 'JKT', status: 'in_transit' })
    expect(res.id).toBe('SHP-1')
  })

  it('getShipmentById returns record', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ id: 'SHP-1', shipment_id: 'SHP-1', customer: 'PT AAA', origin: 'SBY', destination: 'JKT', status: 'in_transit' }])
    const rec = await getShipmentById('SHP-1')
    expect(rec?.customer).toBe('PT AAA')
  })

  it('updateShipment patches fields and returns updated record', async () => {
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    ;(prisma.$queryRaw as any).mockResolvedValue([{ id: 'SHP-1', shipment_id: 'SHP-1', customer: 'PT BBB', origin: 'SBY', destination: 'BDO', status: 'delivered' }])
    const rec = await updateShipment('SHP-1', { customer: 'PT BBB', destination: 'BDO', status: 'delivered' })
    expect(rec?.destination).toBe('BDO')
    expect(rec?.status).toBe('delivered')
  })

  it('deleteShipment returns true when row affected', async () => {
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    const ok = await deleteShipment('SHP-1')
    expect(ok).toBe(true)
  })
})