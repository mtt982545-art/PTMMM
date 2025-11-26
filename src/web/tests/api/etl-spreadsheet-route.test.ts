import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn().mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] }) }
})

vi.mock('@/lib/services/etl-service', () => {
  return {
    importSpreadsheet: vi.fn().mockResolvedValue({ importId: 'IMP-123', rows: 2 }),
  }
})

import { importSpreadsheet } from '@/lib/services/etl-service'
import { POST } from '@/app/api/etl/spreadsheet/route'

describe('API /api/etl/spreadsheet', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('401 jika token salah/absen', async () => {
    const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('200 dengan import_id dan rows saat payload valid + token benar', async () => {
    process.env.ETL_WRITE_TOKEN = 'TKN'
    const body = { source: 'apps_script', sheet_name: 'Orders', rows: [{ order_code: 'ORD-1' }, { order_code: 'ORD-2' }] }
    const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', 'x-etl-token': 'TKN' } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.import_id).toBe('IMP-123')
    expect(json.rows).toBe(2)
    expect(importSpreadsheet).toHaveBeenCalled()
  })
})