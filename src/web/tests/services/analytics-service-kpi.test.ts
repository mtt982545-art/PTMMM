import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return { prisma: { scanEvent: { findMany: vi.fn() } } }
})

import { prisma } from '@/lib/prisma'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'

describe('analytics-service.getAnalyticsOverviewForUser', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns KPI > 0 for demo events', async () => {
    ;(prisma.scanEvent.findMany as any).mockResolvedValue([
      { eventType: 'gate_in', createdAt: new Date() },
      { eventType: 'load_start', createdAt: new Date() },
      { eventType: 'load_finish', createdAt: new Date() },
      { eventType: 'gate_out', createdAt: new Date() },
    ])
    const ctx = { id: 'UID-ADM', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','shipments'] } as any
    const res = await getAnalyticsOverviewForUser(ctx)
    expect(res.kpi.scans).toBeGreaterThan(0)
    expect(res.kpi.gate_in).toBeGreaterThan(0)
    expect(res.kpi.gate_out).toBeGreaterThan(0)
  })
})
