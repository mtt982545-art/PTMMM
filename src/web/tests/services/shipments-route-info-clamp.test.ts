import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      $queryRaw: vi.fn().mockResolvedValue([
        { route_path: ['WH-A','WH-B'], current_leg_index: 99 }
      ])
    }
  }
})

vi.mock('@/lib/auth/server-auth', () => {
  return {
    requireRole: () => true,
    ensureSectionAccess: () => true,
  }
})

import { getShipmentRouteInfoForOps } from '@/lib/services/shipments-service'

describe('shipments-service route info clamping', () => {
  it('clamps out-of-range index to last leg', async () => {
    const ctx = { id: 'U-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], sectionsAllowed: ['events','kpi'] } as any
    const res = await getShipmentRouteInfoForOps(ctx, 'SHP-TEST')
    expect(res?.route_path).toEqual(['WH-A','WH-B'])
    expect(res?.current_leg_index).toEqual(1)
  })
})
