import { describe, it, expect, vi } from 'vitest'
import { computeStopBadges } from '@/lib/ui/route-badges'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      $queryRaw: vi.fn().mockResolvedValue([
        { route_path: ['WH-SDA','WH-NGJ','WH-SGS','WH-SRG'], current_leg_index: 1 }
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

import { getShipmentRouteInfoForAdmin } from '@/lib/services/shipments-service'

describe('route info → ui badges', () => {
  it('computes badges from per-role route info', async () => {
    const ctx = { id: 'U-ADM', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: [], sectionsAllowed: ['shipments','kpi'] } as any
    const info = await getShipmentRouteInfoForAdmin(ctx, 'SHP-ROUTE-001')
    const badges = computeStopBadges(info?.route_path || [], info?.current_leg_index || 0)
    expect(badges.map(b => b.status)).toEqual(['completed','completed','active','pending'])
  })
})
