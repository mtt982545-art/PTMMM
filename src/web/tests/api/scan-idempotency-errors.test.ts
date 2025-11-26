import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn() }
})

vi.mock('@/lib/services/scan-service', () => {
  return { createScanEvent: vi.fn() }
})

import { getServerUserContext } from '@/lib/auth/server-auth'
import { POST } from '@/app/api/scan/route'
import { createScanEvent } from '@/lib/services/scan-service'
import { AppError } from '@/lib/errors'

describe('API /api/scan idempotency handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SCAN_WRITE_TOKEN = 'SCN'
  })

  it('duplicate gate_in → 409', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-SEC', email: 'sec@ptmmm.co', role: 'security', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['events'] })
    ;(createScanEvent as any).mockRejectedValue(new AppError(409, 'Duplicate event'))
    const headers = new Headers({ 'x-scan-token': 'SCN', 'content-type': 'application/json', 'x-forwarded-for': '3.3.3.3' })
    const body = { eventType: 'gate_in', formCode: 'FORM-OPS-001', payload: { idempotency_key: 'IDEM' }, idempotencyKey: 'IDEM' }
    const res = await POST(new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(body) }))
    expect(res.status).toBe(409)
  })

  it('duplicate load_start → 409', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] })
    ;(createScanEvent as any).mockRejectedValue(new AppError(409, 'Duplicate event'))
    const headers = new Headers({ 'x-scan-token': 'SCN', 'content-type': 'application/json', 'x-forwarded-for': '4.4.4.4' })
    const body = { eventType: 'load_start', formCode: 'FORM-OPS-001', payload: { idempotency_key: 'IDEM' }, idempotencyKey: 'IDEM' }
    const res = await POST(new Request('http://localhost/api/scan', { method: 'POST', headers, body: JSON.stringify(body) }))
    expect(res.status).toBe(409)
  })
})

