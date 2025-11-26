import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn() }
})

vi.mock('@/lib/services/scan-service', () => {
  return { createScanEvent: vi.fn().mockResolvedValue({ id: 'EVT-9' }) }
})

import { getServerUserContext } from '@/lib/auth/server-auth'
import { POST } from '@/app/api/scan/route'

describe('Route Authorization: /api/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SCAN_WRITE_TOKEN = 'SCN'
  })

  describe('Unauthenticated', () => {
    it('401 ketika user tidak login', async () => {
      ;(getServerUserContext as any).mockResolvedValue(null)
      const req = new Request('http://localhost/api/scan', { method: 'POST', headers: { 'content-type': 'application/json', 'x-scan-token': 'SCN' }, body: JSON.stringify({}) })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })
  })

  describe('Authenticated', () => {
    describe('Invalid Role', () => {
      it('403 ketika role marketing (tanpa events)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-MKT', email: 'mkt@ptmmm.co', role: 'marketing', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','orders'] })
        const req = new Request('http://localhost/api/scan', { method: 'POST', headers: { 'content-type': 'application/json', 'x-scan-token': 'SCN' }, body: JSON.stringify({}) })
        const res = await POST(req)
        expect(res.status).toBe(403)
      })
    })

    describe('Valid Role', () => {
      it('200 ketika role ops (events diizinkan)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] })
        const req = new Request('http://localhost/api/scan', { method: 'POST', headers: { 'content-type': 'application/json', 'x-scan-token': 'SCN' }, body: JSON.stringify({ eventType: 'scan' }) })
        const res = await POST(req)
        expect(res.status).toBe(200)
      })

      it('200 ketika role security (events diizinkan)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-SEC', email: 'sec@ptmmm.co', role: 'security', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['events'] })
        const req = new Request('http://localhost/api/scan', { method: 'POST', headers: { 'content-type': 'application/json', 'x-scan-token': 'SCN' }, body: JSON.stringify({ eventType: 'gate_in' }) })
        const res = await POST(req)
        expect(res.status).toBe(200)
      })
    })
  })
})