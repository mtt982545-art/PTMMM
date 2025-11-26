import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn() }
})

vi.mock('@/lib/services/scan-service', () => {
  return { createScanEvent: vi.fn().mockResolvedValue({ id: 'EVT-X' }) }
})

import { getServerUserContext } from '@/lib/auth/server-auth'
import { POST } from '@/app/api/scan/route'
import { createScanEvent } from '@/lib/services/scan-service'

describe('API /api/scan event types', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SCAN_WRITE_TOKEN = 'SCN'
  })

  it('security: gate_in dan gate_out → 200', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-SEC', email: 'sec@ptmmm.co', role: 'security', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['events'] })
    const headers = new Headers({ 'x-scan-token': 'SCN', 'content-type': 'application/json', 'x-forwarded-for': '1.1.1.1' })
    const bodyIn = { eventType: 'gate_in', formCode: 'FORM-OPS-001' }
    const bodyOut = { eventType: 'gate_out', formCode: 'FORM-OPS-001' }
    const resIn = await POST(new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(bodyIn) }))
    const resOut = await POST(new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(bodyOut) }))
    expect(resIn.status).toBe(200)
    expect(resOut.status).toBe(200)
    expect((createScanEvent as any).mock.calls.length).toBe(2)
  })

  it('ops: load_start, load_finish, scan → 200', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] })
    const headers = new Headers({ 'x-scan-token': 'SCN', 'content-type': 'application/json', 'x-forwarded-for': '2.2.2.2' })
    const bodyStart = { eventType: 'load_start', formCode: 'FORM-OPS-001' }
    const bodyFinish = { eventType: 'load_finish', formCode: 'FORM-OPS-001' }
    const bodyScan = { eventType: 'scan', formCode: 'FORM-OPS-001' }
    const resStart = await POST(new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(bodyStart) }))
    const resFinish = await POST(new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(bodyFinish) }))
    const resScan = await POST(new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(bodyScan) }))
    expect(resStart.status).toBe(200)
    expect(resFinish.status).toBe(200)
    expect(resScan.status).toBe(200)
    expect((createScanEvent as any).mock.calls.length).toBe(3)
  })
})

