import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
    },
  }
})

import { prisma } from '@/lib/prisma'
import type { UserContext } from '@/lib/types'
import { getShipmentRouteInfoForAdmin, updateShipmentRouteInfoForAdmin } from '@/lib/services/shipments-service'

function makeCtx(role: UserContext['role']): UserContext {
  const map: Record<UserContext['role'], UserContext['sectionsAllowed']> = {
    admin: ['shipments','kpi','events','orders','reports'],
    marketing: ['shipments','kpi','orders'],
    ops: ['shipments','kpi','events'],
    security: ['events'],
    driver: ['shipments'],
  }
  return { id: 'U', email: 'user@ptmmm.co', role, warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: map[role] }
}

describe('shipments-service admin route helpers', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('getShipmentRouteInfoForAdmin mengembalikan route_path dan indeks yang di-clamp', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ route_path: ['WH-A'], current_leg_index: 9 }])
    const res = await getShipmentRouteInfoForAdmin(makeCtx('admin'), 'SHP-1')
    expect(res).toBeTruthy()
    expect(res?.route_path).toEqual(['WH-A'])
    expect(res?.current_leg_index).toBe(0)
  })

  it('updateShipmentRouteInfoForAdmin melakukan clamp indeks sesuai panjang route_path', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ route_path: ['WH-A'], current_leg_index: 0 }])
    const res = await updateShipmentRouteInfoForAdmin(makeCtx('marketing'), 'SHP-2', { route_path: ['WH-A','WH-B'], current_leg_index: 9 })
    expect(res).toBeTruthy()
    expect(res?.current_leg_index).toBe(1)
    expect((prisma.$executeRaw as any).mock.calls.length).toBe(1)
  })

  it('Marketing ditolak mengubah route_path setelah ada scan operasional', async () => {
    ;(prisma.$queryRaw as any).mockImplementation((q: any) => {
      const s = String(q)
      if (s.includes('SELECT route_path, current_leg_index FROM shipments')) {
        return Promise.resolve([{ route_path: ['WH-A'], current_leg_index: 0 }])
      }
      if (s.includes('SELECT COUNT(*) AS c FROM scan_event')) {
        return Promise.resolve([{ c: 1 }])
      }
      return Promise.resolve([])
    })
    await expect(updateShipmentRouteInfoForAdmin(makeCtx('marketing'), 'SHP-OPS-LOCK', { route_path: ['WH-A','WH-B'], current_leg_index: 1 })).rejects.toThrow()
  })

  it('RBAC: role non-berwenang ditolak', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ route_path: ['WH-A'], current_leg_index: 0 }])
    await expect(getShipmentRouteInfoForAdmin(makeCtx('ops'), 'SHP-3')).rejects.toThrow()
    await expect(updateShipmentRouteInfoForAdmin(makeCtx('security'), 'SHP-3', { current_leg_index: 0 })).rejects.toThrow()
  })
})
