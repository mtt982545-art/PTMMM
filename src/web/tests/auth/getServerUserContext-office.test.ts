import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined }) }))

const mockUser = { id: 'SUPA-1', email: 'user@ptmmm.co' }

vi.mock('@/lib/supabase/server', () => {
  return {
    getServerSupabase: () => ({
      auth: { getUser: async () => ({ data: { user: mockUser } }) },
      from: (table: string) => {
        const builder = {
          select: (_cols?: string) => builder,
          eq: (col: string, val: any) => {
            if (table === 'user_org_role' && col === 'user_email') {
              return { single: async () => ({ data: { org_id: 'ORG-1', role: 'ops' } }) }
            }
            if (table === 'warehouse_member' && col === 'user_email') {
              return { data: [] }
            }
            if (table === 'office_member' && col === 'user_id') {
              return { data: [{ office_id: 'OFF-1' }] }
            }
            return { data: [] }
          },
          single: async () => ({ data: null }),
          in: (col: string, vals: any[]) => {
            if (table === 'office_warehouse_map' && col === 'office_id') {
              return { data: [{ warehouse_id: 'WH-1' }, { warehouse_id: 'WH-2' }] }
            }
            return { data: [] }
          },
        }
        return builder
      },
    })
  }
})

import { getServerUserContext } from '@/lib/auth/server-auth'

describe('getServerUserContext with office mapping', () => {
  it('mengisi warehouseIds dari office jika tidak ada warehouse_member', async () => {
    const ctx = await getServerUserContext()
    expect(ctx?.orgId).toBe('ORG-1')
    expect(ctx?.role).toBe('ops')
    expect(ctx?.warehouseIds.length).toBeGreaterThan(0)
  })
})
