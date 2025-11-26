import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn().mockResolvedValue({ id: 'UID-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] }) }
})

vi.mock('@/lib/services/route-service', () => {
  return {
    getRouteWithStopsAndItems: vi.fn(),
  }
})

import { getRouteWithStopsAndItems } from '@/lib/services/route-service'
import { GET } from '@/app/api/route/[code]/route'

describe('API /api/route/[code]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('code valid → 200 { ok: true, data }', async () => {
    ;(getRouteWithStopsAndItems as any).mockResolvedValue({ id: 'R1', code: 'RT-001', status: 'on_route', stops: [], shipments: [] })
    const res = await GET(new Request('http://localhost/api/route/RT-001'), { params: { code: 'RT-001' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.code).toBe('RT-001')
  })

  it('code tidak ada → 404 { ok: false, message: "Not found" }', async () => {
    ;(getRouteWithStopsAndItems as any).mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/route/UNKNOWN'), { params: { code: 'UNKNOWN' } })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Not found')
  })
})