import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      scanEvent: { findMany: vi.fn() },
    },
  }
})

import { prisma } from '@/lib/prisma'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'

describe('analytics-service KPI menghitung semua raw event', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('menghitung duplikat sebagai event terpisah', async () => {
    const base = Date.now()
    const rows = [
      { id: 'E1', eventType: 'gate_in', createdAt: new Date(base - 1000), warehouseId: 'WH-A', organizationId: 'ORG-1' },
      { id: 'E2', eventType: 'gate_in', createdAt: new Date(base - 500), warehouseId: 'WH-A', organizationId: 'ORG-1' },
      { id: 'E3', eventType: 'gate_out', createdAt: new Date(base), warehouseId: 'WH-A', organizationId: 'ORG-1' },
    ]
    ;(prisma.scanEvent.findMany as any).mockResolvedValue(rows)
    const ctx = { id: 'U', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: ['WH-A'], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','orders','shipments','reports'] }
    const { kpi } = await getAnalyticsOverviewForUser(ctx as any)
    expect(kpi.gate_in).toBe(2)
    expect(kpi.gate_out).toBe(1)
    expect(kpi.scans).toBe(3)
  })
})

