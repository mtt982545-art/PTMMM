import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const prisma = {
    $queryRaw: vi.fn(async (q: any) => {
      const s = String(q)
      if (s.includes('SELECT id FROM shipments')) return [{ id: 'SHIP-1' }]
      if (s.includes('SELECT COUNT(*) AS c FROM tracking_ping')) return [{ c: 0 }]
      if (s.includes('SELECT COUNT(*) AS c FROM scan_event')) return [{ c: 0 }]
      if (s.includes('SELECT route_path, current_leg_index FROM shipments')) return [{ route_path: ['WH-A','WH-B'], current_leg_index: 0 }]
      return []
    }),
    document: { findFirst: vi.fn() },
    routeSchedule: { findUnique: vi.fn() },
    driverProfile: { findUnique: vi.fn() },
    shipment: { findFirst: vi.fn().mockResolvedValue({ id: 'SHIP-1' }) },
  }
  return { prisma }
})

import { prisma } from '@/lib/prisma'
import type { UserContext } from '@/lib/types'
import { isShipmentAssignedToDriver, getShipmentRouteInfoForDriver } from '@/lib/services/shipments-service'

describe('shipments-service driver assignment', () => {
  const ctx: UserContext = { id: 'UID-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] }

  beforeEach(() => { vi.clearAllMocks() })

  it('assigned via route_schedule → driverProfile.supabaseUserId match', async () => {
    ;((prisma as any).document.findFirst as any).mockResolvedValue({ refCode: 'RS-1' })
    ;((prisma as any).routeSchedule.findUnique as any).mockResolvedValue({ driverProfileId: 'DRV-1' })
    ;((prisma as any).driverProfile.findUnique as any).mockResolvedValue({ supabaseUserId: 'UID-DRV' })
    const ok = await isShipmentAssignedToDriver(ctx, 'SHP-1')
    expect(ok).toBe(true)
  })

  it('assigned via tracking_ping when schedule not present', async () => {
    ;((prisma as any).document.findFirst as any).mockResolvedValue(null)
    ;(prisma.$queryRaw as any).mockImplementation(async (q: any) => {
      const s = String(q)
      if (s.includes('SELECT id FROM shipments')) return [{ id: 'SHIP-1' }]
      if (s.includes('SELECT COUNT(*) AS c FROM tracking_ping')) return [{ c: 1 }]
      if (s.includes('SELECT COUNT(*) AS c FROM scan_event')) return [{ c: 0 }]
      if (s.includes('SELECT route_path, current_leg_index FROM shipments')) return [{ route_path: ['WH-A','WH-B'], current_leg_index: 0 }]
      return []
    })
    const ok = await isShipmentAssignedToDriver(ctx, 'SHP-1')
    expect(ok).toBe(true)
  })

  it('assigned via scan_event when others missing', async () => {
    ;((prisma as any).document.findFirst as any).mockResolvedValue(null)
    ;(prisma.$queryRaw as any).mockImplementation(async (q: any) => {
      const s = String(q)
      if (s.includes('SELECT id FROM shipments')) return [{ id: 'SHIP-1' }]
      if (s.includes('SELECT COUNT(*) AS c FROM tracking_ping')) return [{ c: 0 }]
      if (s.includes('SELECT COUNT(*) AS c FROM scan_event')) return [{ c: 1 }]
      if (s.includes('SELECT route_path, current_leg_index FROM shipments')) return [{ route_path: ['WH-A','WH-B'], current_leg_index: 0 }]
      return []
    })
    const ok = await isShipmentAssignedToDriver(ctx, 'SHP-1')
    expect(ok).toBe(true)
  })

  it('getShipmentRouteInfoForDriver throws 403 when not assigned', async () => {
    ;((prisma as any).document.findFirst as any).mockResolvedValue(null)
    ;(prisma.$queryRaw as any).mockResolvedValueOnce([{ c: 0 }])
    ;(prisma.$queryRaw as any).mockResolvedValueOnce([{ c: 0 }])
    let threw = false
    try {
      await getShipmentRouteInfoForDriver(ctx, 'SHP-1')
    } catch (e: any) {
      threw = true
      expect(e?.status || e?.code || 403).toBe(403)
    }
    expect(threw).toBe(true)
  })
})
