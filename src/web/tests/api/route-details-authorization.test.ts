import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn() }
})

vi.mock('@/lib/services/route-service', () => {
  return { getRouteWithStopsAndItems: vi.fn().mockResolvedValue({ id: 'R1', code: 'RT-001', status: 'on_route', stops: [], shipments: [] }) }
})

import { getServerUserContext } from '@/lib/auth/server-auth'
import { GET } from '@/app/api/route/[code]/route'

describe('Route Authorization: /api/route/details', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('Unauthenticated', () => {
    it('401 ketika user tidak login', async () => {
      ;(getServerUserContext as any).mockResolvedValue(null)
      const res = await GET(new Request('http://localhost/api/route/RT-001'), { params: { code: 'RT-001' } })
      expect(res.status).toBe(401)
    })
  })

  describe('Authenticated', () => {
    describe('Invalid Role', () => {
      it('403 ketika role marketing (tanpa shipments)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-MKT', email: 'mkt@ptmmm.co', role: 'marketing', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','orders'] })
        const res = await GET(new Request('http://localhost/api/route/RT-001'), { params: { code: 'RT-001' } })
        expect(res.status).toBe(403)
      })
    })

    describe('Valid Role', () => {
      it('200 ketika role ops (shipments diizinkan)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] })
        const res = await GET(new Request('http://localhost/api/route/RT-001'), { params: { code: 'RT-001' } })
        expect(res.status).toBe(200)
      })

      it('200 ketika role driver (shipments diizinkan)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] })
        const res = await GET(new Request('http://localhost/api/route/RT-001'), { params: { code: 'RT-001' } })
        expect(res.status).toBe(200)
      })
    })
  })
})