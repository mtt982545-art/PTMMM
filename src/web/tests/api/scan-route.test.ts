import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/services/scan-service', () => {
  return {
    createScanEvent: vi.fn().mockResolvedValue({ id: 'EVT-1' })
  }
})

import { POST } from '@/app/api/scan/route'
import { resetRateLimiter } from '@/lib/rate-limit'
import { createScanEvent } from '@/lib/services/scan-service'

describe('API /api/scan', () => {
  beforeEach(() => {
    resetRateLimiter()
    process.env.SCAN_WRITE_TOKEN = 'TEST-TOKEN'
  })

  // Happy path: token benar → 200 { ok: true, id }
  it('happy path: token benar → 200 { ok: true, id }', async () => {
    const headers = new Headers({
      'x-scan-token': 'TEST-TOKEN',
      'content-type': 'application/json',
      'x-forwarded-for': '1.2.3.4',
    })
    const body = { eventType: 'scan', shipmentId: 'SHIP-001', formCode: 'FORM-OPS-001' }
    const req = new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(body) })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(typeof json.id).toBe('string')
    expect((createScanEvent as any).mock.calls.length).toBe(1)
    const callArg = (createScanEvent as any).mock.calls[0][0]
    expect(callArg).toMatchObject(body)
  })

  // Limit 120/min per kombinasi IP + token: panggilan ke-121 harus 429
  it('rate limit: setelah melewati batas → 429', async () => {
    const headers = new Headers({
      'x-scan-token': 'TEST-TOKEN',
      'content-type': 'application/json',
      'x-forwarded-for': '7.7.7.7',
    })
    const body = { eventType: 'scan', shipmentId: 'SHIP-001', formCode: 'FORM-OPS-001' }
    // 120 panggilan diizinkan
    for (let i = 0; i < 120; i++) {
      const req = new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(body) })
      const res = await POST(req as any)
      expect(res.status).toBe(200)
    }
    // panggilan ke-121 ditolak
    const req2 = new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(body) })
    const res2 = await POST(req2 as any)
    expect(res2.status).toBe(429)
    const json = await res2.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Too Many Requests')
  })

  it('401 jika token absen atau salah', async () => {
    const headersMissing = new Headers({
      'content-type': 'application/json',
      'x-forwarded-for': '2.2.2.2',
    })
    const body = { eventType: 'scan', shipmentId: 'SHIP-001', formCode: 'FORM-OPS-001' }
    const reqMissing = new Request('http://localhost/api/scan', { method: 'POST', headers: headersMissing, body: JSON.stringify(body) })
    const resMissing = await POST(reqMissing as any)
    expect(resMissing.status).toBe(401)
    const jsonMissing = await resMissing.json()
    expect(jsonMissing.ok).toBe(false)
    expect(jsonMissing.message).toBe('Unauthorized')

    const headersWrong = new Headers({
      'x-scan-token': 'WRONG',
      'content-type': 'application/json',
      'x-forwarded-for': '2.2.2.2',
    })
    const reqWrong = new Request('http://localhost/api/scan', { method: 'POST', headers: headersWrong, body: JSON.stringify(body) })
    const resWrong = await POST(reqWrong as any)
    expect(resWrong.status).toBe(401)
    const jsonWrong = await resWrong.json()
    expect(jsonWrong.ok).toBe(false)
    expect(jsonWrong.message).toBe('Unauthorized')
  })
})