import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const $queryRaw = vi.fn(async (q: any) => {
    const s = String(q)
    if (s.includes('SELECT route_path, current_leg_index FROM shipments')) return [{ route_path: [], current_leg_index: 5 }]
    if (s.includes('SELECT id FROM shipments')) return [{ id: 'SHIP-SHP-TEST' }]
    if (s.includes('SELECT COUNT(*) AS c FROM tracking_ping')) return [{ c: 0 }]
    if (s.includes('SELECT COUNT(*) AS c FROM scan_event')) return [{ c: 1 }]
    return []
  })
  return { prisma: { $queryRaw } }
})

vi.mock('@/lib/auth/server-auth', () => {
  return {
    requireRole: () => true,
    ensureSectionAccess: () => true,
  }
})

import { getShipmentRouteInfoForDriver } from '@/lib/services/shipments-service'

describe('shipments-service driver route info clamping', () => {
  it('clamps index to 0 when route_path is empty', async () => {
    const ctx = { id: 'U-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], sectionsAllowed: ['shipments'] } as any
    const res = await getShipmentRouteInfoForDriver(ctx, 'SHP-TEST')
    expect(res?.route_path).toEqual([])
    expect(res?.current_leg_index).toEqual(0)
  })
})
