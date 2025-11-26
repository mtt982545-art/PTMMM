import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn().mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] }) }
})

vi.mock('@/lib/services/tracking-service', () => {
  return {
    getTrackingTimeline: vi.fn(),
  }
})

import { getTrackingTimeline } from '@/lib/services/tracking-service'
import { GET } from '@/app/api/tracking/[token]/route'

describe('API /api/tracking/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Happy path: token valid → 200 { ok: true, data }
  it('token valid → 200 { ok: true, data }', async () => {
    ;(getTrackingTimeline as any).mockResolvedValue({ token: 'DEMO-TRACK-001', status: 'In Transit', events: [] })
    const res = await GET(new Request('http://localhost/api/tracking/DEMO-TRACK-001'), { params: { token: 'DEMO-TRACK-001' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.token).toBe('DEMO-TRACK-001')
  })

  // Token tidak ada → 404 { ok: false, message: 'Not found' }
  it('token tidak ada → 404 { ok: false, message: "Not found" }', async () => {
    ;(getTrackingTimeline as any).mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/tracking/UNKNOWN'), { params: { token: 'UNKNOWN' } })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Not found')
  })
})