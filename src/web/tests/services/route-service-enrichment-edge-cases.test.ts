import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return { prisma: { route: { findFirst: vi.fn() } } }
})

import { prisma } from '@/lib/prisma'
import { getRouteWithStopsAndItems } from '@/lib/services/route-service'

describe('route-service enrichment edge cases', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('Tanpa shipment: route_path dari stops, active_leg_index=0, status terdefinisi', async () => {
    ;(prisma as any).route.findFirst.mockResolvedValue({
      id: 'R-NO-SHIP', code: 'RT-NO-SHIP', status: 'planned',
      stops: [
        { id: 'RS-A', stopSeq: 0, warehouseId: 'WH-A', plannedArrival: null, plannedDeparture: null, shipmentItems: [], scanEvents: [] },
        { id: 'RS-B', stopSeq: 1, warehouseId: 'WH-B', plannedArrival: null, plannedDeparture: null, shipmentItems: [], scanEvents: [] },
        { id: 'RS-C', stopSeq: 2, warehouseId: 'WH-C', plannedArrival: null, plannedDeparture: null, shipmentItems: [], scanEvents: [] },
      ],
      shipments: [],
    })
    const res = await getRouteWithStopsAndItems('RT-NO-SHIP')
    expect(res).toBeTruthy()
    expect(res?.route_path).toEqual(['WH-A','WH-B','WH-C'])
    expect(res?.active_leg_index).toBe(0)
    const statuses = res?.stops.map(s => s.status)
    expect(statuses).toEqual(['completed','active','pending'])
  })

  it('Beberapa shipment: active_leg_index = max currentLegIndex, status konsisten', async () => {
    ;(prisma as any).route.findFirst.mockResolvedValue({
      id: 'R-MULTI', code: 'RT-MULTI', status: 'on_route',
      stops: [
        { id: 'RS-A', stopSeq: 0, warehouseId: 'WH-A', plannedArrival: null, plannedDeparture: null, shipmentItems: [], scanEvents: [] },
        { id: 'RS-B', stopSeq: 1, warehouseId: 'WH-B', plannedArrival: null, plannedDeparture: null, shipmentItems: [], scanEvents: [] },
        { id: 'RS-C', stopSeq: 2, warehouseId: 'WH-C', plannedArrival: null, plannedDeparture: null, shipmentItems: [], scanEvents: [] },
      ],
      shipments: [
        { id: 'SH-1', shipmentId: 'SHP-1', status: 'in_transit', currentLegIndex: 0 },
        { id: 'SH-2', shipmentId: 'SHP-2', status: 'in_transit', currentLegIndex: 2 },
      ],
    })
    const res = await getRouteWithStopsAndItems('RT-MULTI')
    expect(res?.active_leg_index).toBe(2)
    const statuses = res?.stops.map(s => s.status)
    expect(statuses).toEqual(['completed','completed','completed'])
  })

  it('Shipment currentLegIndex out-of-range: di-clamp, status predictable', async () => {
    ;(prisma as any).route.findFirst.mockResolvedValue({
      id: 'R-CLAMP', code: 'RT-CLAMP', status: 'on_route',
      stops: [
        { id: 'RS-A', stopSeq: 0, warehouseId: 'WH-A', plannedArrival: null, plannedDeparture: null, shipmentItems: [], scanEvents: [] },
        { id: 'RS-B', stopSeq: 1, warehouseId: 'WH-B', plannedArrival: null, plannedDeparture: null, shipmentItems: [], scanEvents: [] },
      ],
      shipments: [
        { id: 'SH-1', shipmentId: 'SHP-1', status: 'in_transit', currentLegIndex: 9 },
      ],
    })
    const res = await getRouteWithStopsAndItems('RT-CLAMP')
    expect(res?.route_path).toEqual(['WH-A','WH-B'])
    expect(res?.active_leg_index).toBe(1)
    const statuses = res?.stops.map(s => s.status)
    expect(statuses).toEqual(['completed','completed'])
  })
})
