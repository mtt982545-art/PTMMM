import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn().mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] }) }
})

vi.mock('@/lib/services/tracking-service', () => {
  return {
    getTrackingTimeline: vi.fn().mockResolvedValue({ token: 'DEMO-TRACK-001', status: 'In Transit', events: [] })
  }
})

import { GET } from '@/app/api/tracking/[token]/route'
import { resetRateLimiter } from '@/lib/rate-limit'

describe('API /api/tracking/[token] rate limit', () => {
  beforeEach(() => {
    resetRateLimiter()
  })

  // Limit 60/min/IP: panggilan ke-61 harus 429 { ok: false, message: 'Too Many Requests' }
  it('429 setelah melewati batas dalam 1 menit', async () => {
    const headers = new Headers({ 'x-forwarded-for': '9.9.9.9' })
    let last: Response | null = null
    for (let i = 0; i < 60; i++) {
      const res = await GET(new Request('http://localhost/api/tracking/DEMO-TRACK-001', { headers }), { params: { token: 'DEMO-TRACK-001' } })
      expect(res.status).toBe(200)
      last = res
    }
    const res2 = await GET(new Request('http://localhost/api/tracking/DEMO-TRACK-001', { headers }), { params: { token: 'DEMO-TRACK-001' } })
    expect(res2.status).toBe(429)
    const json = await res2.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Too Many Requests')
    expect(last).not.toBeNull()
  })
})