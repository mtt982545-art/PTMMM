import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn() }
})

vi.mock('@/lib/services/tracking-service', () => {
  return { getTrackingTimeline: vi.fn().mockResolvedValue({ token: 'DEMO-TRACK-001', status: 'In Transit', events: [] }) }
})

import { getServerUserContext } from '@/lib/auth/server-auth'
import { GET } from '@/app/api/tracking/[token]/route'

describe('Route Authorization: /api/tracking', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('Unauthenticated', () => {
    it('401 ketika user tidak login', async () => {
      ;(getServerUserContext as any).mockResolvedValue(null)
      const res = await GET(new Request('http://localhost/api/tracking/DEMO-TRACK-001'), { params: { token: 'DEMO-TRACK-001' } })
      expect(res.status).toBe(401)
    })
  })

  describe('Authenticated', () => {
    describe('Invalid Role', () => {
      it('403 ketika role security (tanpa shipments)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-SEC', email: 'sec@ptmmm.co', role: 'security', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['events'] })
        const res = await GET(new Request('http://localhost/api/tracking/DEMO-TRACK-001'), { params: { token: 'DEMO-TRACK-001' } })
        expect(res.status).toBe(403)
      })
    })

    describe('Valid Role', () => {
      it('200 ketika role driver (shipments diizinkan)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] })
        const res = await GET(new Request('http://localhost/api/tracking/DEMO-TRACK-001'), { params: { token: 'DEMO-TRACK-001' } })
        expect(res.status).toBe(200)
      })

      it('200 ketika role admin (shipments diizinkan)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-ADM', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','orders','shipments','reports'] })
        const res = await GET(new Request('http://localhost/api/tracking/DEMO-TRACK-001'), { params: { token: 'DEMO-TRACK-001' } })
        expect(res.status).toBe(200)
      })
    })
  })
})