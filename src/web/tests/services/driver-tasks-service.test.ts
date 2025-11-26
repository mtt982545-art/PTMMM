import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const $queryRaw = vi.fn(async (q: any) => {
    const s = String(q)
    if (s.includes('FROM document')) {
      return [
        { shipment_id: 'SHP-A', customer: 'C1', origin: 'O1', destination: 'D1', status: 'in_transit', warehouse_id: 'WH-1' },
      ]
    }
    if (s.includes('FROM tracking_ping')) {
      return [
        { shipment_id: 'SHP-A', customer: 'C1', origin: 'O1', destination: 'D1', status: 'in_transit', warehouse_id: 'WH-1' },
        { shipment_id: 'SHP-B', customer: 'C2', origin: 'O2', destination: 'D2', status: 'in_transit', warehouse_id: 'WH-2' },
      ]
    }
    if (s.includes('FROM scan_event')) {
      return [
        { shipment_id: 'SHP-C', customer: 'C3', origin: 'O3', destination: 'D3', status: 'delivered', warehouse_id: 'WH-1' },
      ]
    }
    return []
  })
  return { prisma: { $queryRaw } }
})

vi.mock('@/lib/auth/server-auth', () => ({
  requireRole: () => true,
  ensureSectionAccess: () => true,
}))

import { getDriverTasks } from '@/lib/services/shipments-service'

describe('getDriverTasks precedence and scoping', () => {
  const ctx: any = { id: 'DRV-1', email: 'drv@ptmmm.co', role: 'driver', orgId: 'ORG-1', warehouseIds: ['WH-1'], sectionsAllowed: ['shipments'] }

  it('applies precedence schedule > tracking > scan and filters warehouse', async () => {
    const res = await getDriverTasks(ctx, { onlyActive: true })
    expect(res.find(x => x.shipment_id === 'SHP-A')?.proof).toBe('schedule')
    expect(res.some(x => x.shipment_id === 'SHP-B')).toBe(false)
    expect(res.some(x => x.shipment_id === 'SHP-C')).toBe(false)
  })

  it('returns limited tasks when limit provided', async () => {
    const res = await getDriverTasks(ctx, { limit: 1 })
    expect(res.length).toBe(1)
  })
})

