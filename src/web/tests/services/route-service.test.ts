import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      route: { findFirst: vi.fn() },
      shipment: { findFirst: vi.fn() },
    },
  }
})

import { prisma } from '@/lib/prisma'
import { getRouteWithStopsAndItems, getShipmentItemsByShipmentCode } from '@/lib/services/route-service'

describe('route-service.getRouteWithStopsAndItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengembalikan ringkasan stops, items, dan shipments untuk code route valid', async () => {
;(prisma as any).route.findFirst.mockResolvedValue({
      id: 'R1',
      code: 'RT-SDA-NGJ-SGS-SRG-001',
      status: 'on_route',
      stops: [
        {
          id: 'S1',
          stopSeq: 1,
          warehouseId: 'WH-SDA',
          plannedArrival: new Date('2025-01-01T08:00:00Z'),
          plannedDeparture: new Date('2025-01-01T09:00:00Z'),
          shipmentItems: [
            { collyCount: 8, weightKg: { toString: () => '120', add: () => ({ toString: () => '120' }) }, volumeM3: { toString: () => '0.9', add: () => ({ toString: () => '0.9' }) } },
          ],
          scanEvents: [{ id: 'E1' }],
        },
        {
          id: 'S2',
          stopSeq: 2,
          warehouseId: 'WH-NGJ',
          plannedArrival: new Date('2025-01-01T11:00:00Z'),
          plannedDeparture: new Date('2025-01-01T11:30:00Z'),
          shipmentItems: [
            { collyCount: 6, weightKg: { toString: () => '90', add: () => ({ toString: () => '90' }) }, volumeM3: { toString: () => '0.7', add: () => ({ toString: () => '0.7' }) } },
          ],
          scanEvents: [{ id: 'E2' }, { id: 'E3' }],
        },
      ],
      shipments: [
        { id: 'SH1', shipmentId: 'SHP-ROUTE-001', status: 'in_transit' },
      ],
    })

    const res = await getRouteWithStopsAndItems('RT-SDA-NGJ-SGS-SRG-001')
    expect(res).toBeTruthy()
    expect(res?.stops.length).toBe(2)
    expect(res?.stops[0].items.colly_total).toBe(8)
    expect(res?.stops[1].scan_event_count).toBe(2)
    expect(res?.shipments[0].shipment_id).toBe('SHP-ROUTE-001')
  })
})

describe('route-service.getShipmentItemsByShipmentCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengembalikan daftar item per shipment dengan mapping field yang benar', async () => {
    ;(prisma as any).shipment.findFirst.mockResolvedValue({
      id: 'SH1',
      shipmentId: 'SHP-001',
      items: [
        { id: 'I1', productCode: 'PROD-A', productName: 'Produk A', uom: 'COLLY', collyCount: 10, weightKg: { toString: () => '150' }, volumeM3: { toString: () => '1.2' }, warehouseId: 'WH-SBY', routeStop: null },
        { id: 'I2', productCode: 'PROD-B', productName: 'Produk B', uom: 'COLLY', collyCount: 5, weightKg: { toString: () => '80' }, volumeM3: { toString: () => '0.6' }, warehouseId: 'WH-SBY', routeStop: { stopSeq: 2 } },
      ],
    })

    const res = await getShipmentItemsByShipmentCode('SHP-001')
    expect(res).toBeTruthy()
    expect(res?.items.length).toBe(2)
    expect(res?.items[0].product_code).toBe('PROD-A')
    expect(res?.items[1].route_stop_seq).toBe(2)
  })
})