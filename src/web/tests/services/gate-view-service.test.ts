import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const items = [
    { warehouseId: 'WH-1-ID', productCode: 'PRD-1', productName: 'PRD-1', qtyUnit: 5, uom: 'PCS' },
  ]
  const docs = [
    { id: 'D1', shipmentId: 'ID-1', docType: 'invoice', refCode: 'INV-1' },
    { id: 'D2', shipmentId: 'ID-1', docType: 'surat_jalan', refCode: 'SJ-1' },
    { id: 'D3', shipmentId: 'ID-1', docType: 'route_schedule', refCode: 'RS-1' },
  ]
  const routeSchedule = { id: 'RS-1', driverProfileId: 'DRV-1', vehicleId: 'VEH-1', startAt: new Date(), endAt: new Date() }
  const driver = { id: 'DRV-1', name: 'Driver A', phone: '08123' }
  const vehicle = { id: 'VEH-1', plateNumber: 'B 1234 MM', name: 'CDE', type: 'Truck' }
  const shipment = { id: 'ID-1', shipmentId: 'SHP-1', origin: 'SBY', destination: 'JKT', organizationId: 'ORG-1', warehouseId: 'WH-1-ID' }
  return {
    prisma: {
      $queryRaw: vi.fn(async (q: any) => {
        const s = String(q)
        if (s.includes('SELECT id FROM shipments')) return [{ id: 'ID-1' }]
        return []
      }),
      qrTicket: { findFirst: vi.fn().mockResolvedValue(null) },
      shipment: { findUnique: vi.fn().mockResolvedValue(shipment) },
      shipmentItem: { findMany: vi.fn().mockResolvedValue(items) },
      document: { findMany: vi.fn().mockResolvedValue(docs) },
      routeSchedule: { findUnique: vi.fn().mockResolvedValue(routeSchedule) },
      driverProfile: { findUnique: vi.fn().mockResolvedValue(driver) },
      vehicle: { findUnique: vi.fn().mockResolvedValue(vehicle) },
    },
  }
})

import type { UserContext } from '@/lib/types'
import { getGateViewByShipmentOrToken } from '@/lib/services/gate-view-service'

describe('gate-view-service scoping', () => {
  const baseCtx: UserContext = { id: 'U1', email: 'sec@ptmmm.co', role: 'security', warehouseIds: ['WH-1-ID'], orgId: 'ORG-1', sectionsAllowed: ['events'] }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when within org and warehouse scope', async () => {
    const res = await getGateViewByShipmentOrToken({ shipmentId: 'SHP-1' }, baseCtx)
    expect(res?.shipment?.shipmentId).toBe('SHP-1')
    expect(res?.items?.length).toBeGreaterThan(0)
  })

  it('returns null when org mismatch', async () => {
    const res = await getGateViewByShipmentOrToken({ shipmentId: 'SHP-1' }, { ...baseCtx, orgId: 'ORG-2' })
    expect(res).toBeNull()
  })

  it('returns null when warehouse mismatch and user has scoped warehouses', async () => {
    const res = await getGateViewByShipmentOrToken({ shipmentId: 'SHP-1' }, { ...baseCtx, warehouseIds: ['WH-9'] })
    expect(res).toBeNull()
  })
})

