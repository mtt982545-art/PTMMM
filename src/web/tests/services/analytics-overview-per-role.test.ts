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

function makeRow(id: string, eventType: string, organizationId: string, warehouseId: string, createdAt: Date) {
  return { id, eventType, organizationId, warehouseId, createdAt }
}

describe('analytics overview per role filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('security: hanya event di warehouse yang diizinkan', async () => {
    const base = Date.now() - 3600 * 1000
    const rows = [
      makeRow('E1','gate_in','ORG-1','WH-A', new Date(base + 1)),
      makeRow('E2','gate_in','ORG-1','WH-A', new Date(base + 2)),
      makeRow('E3','load_start','ORG-1','WH-A', new Date(base + 3)),
      makeRow('E4','load_finish','ORG-1','WH-B', new Date(base + 4)),
      makeRow('E5','gate_out','ORG-1','WH-C', new Date(base + 5)),
      makeRow('E6','pod','ORG-1','WH-C', new Date(base + 6)),
      makeRow('E7','gate_in','ORG-2','WH-Z', new Date(base + 7)),
    ]
    ;(prisma.scanEvent.findMany as any).mockImplementation((opts: any) => {
      const { where } = opts || {}
      const org = where?.organizationId
      const whIn: string[] = where?.warehouseId?.in || []
      const createdAtGte: Date | undefined = where?.createdAt?.gte
      return rows.filter((r) => {
        if (createdAtGte && r.createdAt < createdAtGte) return false
        if (org && r.organizationId !== org) return false
        if (whIn.length && !whIn.includes(r.warehouseId)) return false
        return true
      })
    })

    const ctx = { id: 'U', email: 'security@ptmmm.co', role: 'security', orgId: 'ORG-1', warehouseIds: ['WH-A'], sectionsAllowed: ['events'] }
    const { kpi } = await getAnalyticsOverviewForUser(ctx as any)
    expect(kpi.gate_in).toBe(2)
    expect(kpi.gate_out).toBe(0)
  })

  it('ops: menghitung load_start/load_finish sesuai filter gudang', async () => {
    const base = Date.now() - 3600 * 1000
    const rows = [
      makeRow('E1','gate_in','ORG-1','WH-A', new Date(base + 1)),
      makeRow('E2','load_start','ORG-1','WH-A', new Date(base + 2)),
      makeRow('E3','load_finish','ORG-1','WH-B', new Date(base + 3)),
      makeRow('E4','gate_out','ORG-1','WH-C', new Date(base + 4)),
      makeRow('E5','gate_in','ORG-2','WH-Z', new Date(base + 5)),
    ]
    ;(prisma.scanEvent.findMany as any).mockImplementation((opts: any) => {
      const { where } = opts || {}
      const org = where?.organizationId
      const whIn: string[] = where?.warehouseId?.in || []
      const createdAtGte: Date | undefined = where?.createdAt?.gte
      return rows.filter((r) => {
        if (createdAtGte && r.createdAt < createdAtGte) return false
        if (org && r.organizationId !== org) return false
        if (whIn.length && !whIn.includes(r.warehouseId)) return false
        return true
      })
    })

    const ctx = { id: 'U', email: 'ops@ptmmm.co', role: 'ops', orgId: 'ORG-1', warehouseIds: ['WH-A','WH-B'], sectionsAllowed: ['events','kpi','shipments'] }
    const { kpi } = await getAnalyticsOverviewForUser(ctx as any)
    expect(kpi.load_start).toBe(1)
    expect(kpi.load_finish).toBe(1)
    expect(kpi.gate_out).toBe(0)
  })

  it('marketing: tanpa warehouseIds hanya berdasarkan orgId', async () => {
    const base = Date.now() - 3600 * 1000
    const rows = [
      makeRow('E1','gate_in','ORG-1','WH-A', new Date(base + 1)),
      makeRow('E2','gate_out','ORG-1','WH-B', new Date(base + 2)),
      makeRow('E3','load_finish','ORG-1','WH-C', new Date(base + 3)),
      makeRow('E4','gate_in','ORG-2','WH-Z', new Date(base + 4)),
    ]
    ;(prisma.scanEvent.findMany as any).mockImplementation((opts: any) => {
      const { where } = opts || {}
      const org = where?.organizationId
      const createdAtGte: Date | undefined = where?.createdAt?.gte
      return rows.filter((r) => {
        if (createdAtGte && r.createdAt < createdAtGte) return false
        if (org && r.organizationId !== org) return false
        return true
      })
    })

    const ctx = { id: 'U', email: 'm@ptmmm.co', role: 'marketing', orgId: 'ORG-1', warehouseIds: [], sectionsAllowed: ['kpi','orders'] }
    const { kpi } = await getAnalyticsOverviewForUser(ctx as any)
    expect(kpi.gate_in).toBe(1)
    expect(kpi.gate_out).toBe(1)
  })

  it('admin: melihat seluruh warehouse dalam org-nya', async () => {
    const base = Date.now() - 3600 * 1000
    const rows = [
      makeRow('E1','gate_in','ORG-1','WH-A', new Date(base + 1)),
      makeRow('E2','gate_out','ORG-1','WH-B', new Date(base + 2)),
      makeRow('E3','load_finish','ORG-1','WH-C', new Date(base + 3)),
      makeRow('E4','gate_in','ORG-2','WH-Z', new Date(base + 4)),
    ]
    ;(prisma.scanEvent.findMany as any).mockImplementation((opts: any) => {
      const { where } = opts || {}
      const org = where?.organizationId
      const whIn: string[] = where?.warehouseId?.in || []
      const createdAtGte: Date | undefined = where?.createdAt?.gte
      return rows.filter((r) => {
        if (createdAtGte && r.createdAt < createdAtGte) return false
        if (org && r.organizationId !== org) return false
        if (whIn.length && !whIn.includes(r.warehouseId)) return false
        return true
      })
    })

    const ctx = { id: 'U', email: 'admin@ptmmm.co', role: 'admin', orgId: 'ORG-1', warehouseIds: [], sectionsAllowed: ['kpi','events','orders','shipments','reports'] }
    const { kpi } = await getAnalyticsOverviewForUser(ctx as any)
    expect(kpi.gate_in).toBe(1)
    expect(kpi.gate_out).toBe(1)
    expect(kpi.load_finish).toBe(1)
  })
})

