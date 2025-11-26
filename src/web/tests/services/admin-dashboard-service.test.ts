import { describe, it, expect, vi } from 'vitest'
import type { UserContext } from '@/lib/types'

vi.mock('@/lib/prisma', () => {
  let call = 0
  return {
    prisma: {
      $queryRaw: vi.fn(async () => {
        // First call: org count, Second: warehouse count
        call += 1
        return call === 1 ? [{ c: 1 }] : [{ c: 3 }]
      })
    }
  }
})

vi.mock('@/lib/supabase/server', () => {
  return {
    getServerSupabase: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({ data: [{ role: 'admin' }, { role: 'ops' }, { role: 'ops' }] })
        })
      })
    })
  }
})

import { getAdminSummary } from '@/lib/services/admin-dashboard-service'

describe('admin-dashboard-service.getAdminSummary', () => {
  it('mengembalikan ringkasan organisasi, gudang aktif, dan user per role', async () => {
    const ctx: UserContext = { id: 'U', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','orders','shipments','reports'] }
    const sum = await getAdminSummary(ctx)
    expect(sum.organizations).toBe(1)
    expect(sum.activeWarehouses).toBe(3)
    expect(sum.usersByRole.admin).toBe(1)
    expect(sum.usersByRole.ops).toBe(2)
  })
})
