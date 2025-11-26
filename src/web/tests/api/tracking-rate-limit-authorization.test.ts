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

describe('Route Authorization: /api/tracking/rate-limit', () => {
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
      it('403 ketika role marketing (tanpa shipments)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-MKT', email: 'mkt@ptmmm.co', role: 'marketing', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','orders'] })
        const res = await GET(new Request('http://localhost/api/tracking/DEMO-TRACK-001'), { params: { token: 'DEMO-TRACK-001' } })
        expect(res.status).toBe(403)
      })
    })

    describe('Valid Role', () => {
      it('200 ketika role ops (shipments diizinkan)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] })
        const res = await GET(new Request('http://localhost/api/tracking/DEMO-TRACK-001'), { params: { token: 'DEMO-TRACK-001' } })
        expect(res.status).toBe(200)
      })
    })
  })
})