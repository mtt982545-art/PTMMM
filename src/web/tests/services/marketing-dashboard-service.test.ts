import { describe, it, expect, vi } from 'vitest'
import type { UserContext } from '@/lib/types'

const sampleRows = [
  { id: '1', order_code: 'ORD-1', customer: 'C1', origin: 'WH-A', destination: 'WH-B', status: 'new' },
  { id: '2', order_code: 'ORD-2', customer: 'C2', origin: 'WH-A', destination: 'WH-C', status: 'in_progress' },
]

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      $queryRaw: vi.fn(async () => sampleRows)
    }
  }
})

import { getRecentOrdersForUser } from '@/lib/services/marketing-dashboard-service'

describe('marketing-dashboard-service.getRecentOrdersForUser', () => {
  it('tanpa warehouseIds mengembalikan orders terbaru per org', async () => {
    const ctx: UserContext = { id: 'U', email: 'm@ptmmm.co', role: 'marketing', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','orders'] }
    const rows = await getRecentOrdersForUser(ctx)
    expect(rows.length).toBe(sampleRows.length)
  })

  it('dengan warehouseIds mengembalikan orders terbaru yang relevan', async () => {
    const ctx: UserContext = { id: 'U', email: 'm@ptmmm.co', role: 'marketing', warehouseIds: ['WH-1','WH-2'], orgId: 'ORG-1', sectionsAllowed: ['kpi','orders'] }
    const rows = await getRecentOrdersForUser(ctx)
    expect(rows.length).toBe(sampleRows.length)
  })
})
