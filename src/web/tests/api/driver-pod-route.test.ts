import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn().mockResolvedValue({ id: 'DRV-1', email: 'driver1@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-PTMMM', sectionsAllowed: ['shipments'] }) }
})

vi.mock('@/lib/services/scan-service', () => {
  return { createScanEvent: vi.fn().mockResolvedValue({ id: 'EVT-POD-1' }) }
})

import { POST } from '@/app/api/driver/pod/route'
import { resetRateLimiter } from '@/lib/rate-limit'
import { createScanEvent } from '@/lib/services/scan-service'

describe('API /api/driver/pod', () => {
  beforeEach(() => {
    resetRateLimiter()
    process.env.SCAN_WRITE_TOKEN = 'TEST-TOKEN'
  })

  it('driver POD dengan token benar → 200 { ok: true, id }', async () => {
    const headers = new Headers({ 'x-scan-token': 'TEST-TOKEN', 'content-type': 'application/json', 'x-forwarded-for': '5.5.5.5' })
    const body = { eventType: 'pod', shipmentId: 'SHP-POD-1', formCode: 'FORM-OPS-001' }
    const req = new Request('http://localhost/api/driver/pod', { method: 'POST', headers, body: JSON.stringify(body) })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(typeof json.id).toBe('string')
    expect((createScanEvent as any).mock.calls.length).toBe(1)
    const callArg = (createScanEvent as any).mock.calls[0][0]
    expect(callArg).toMatchObject({ ...body, userEmail: 'driver1@ptmmm.co' })
  })
})
