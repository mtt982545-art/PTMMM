import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn() }
})

vi.mock('@/lib/services/etl-service', () => {
  return { importSpreadsheet: vi.fn().mockResolvedValue({ importId: 'IMP-999', rows: 2 }) }
})

import { getServerUserContext } from '@/lib/auth/server-auth'
import { importSpreadsheet } from '@/lib/services/etl-service'
import { POST } from '@/app/api/etl/spreadsheet/route'

describe('Route Authorization: /api/etl/spreadsheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ETL_WRITE_TOKEN = 'TKN'
  })

  describe('Unauthenticated', () => {
    it('401 ketika user tidak login (ctx null)', async () => {
      ;(getServerUserContext as any).mockResolvedValue(null)
      const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', headers: { 'content-type': 'application/json', 'x-etl-token': 'TKN' }, body: JSON.stringify({ source: 'apps_script', sheet_name: 'Orders', rows: [] }) })
      const res = await POST(req)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.ok).toBe(false)
      expect(json.message).toBe('Unauthorized')
    })
  })

  describe('Authenticated', () => {
    describe('Invalid Role', () => {
      it('403 ketika role tidak diizinkan (marketing)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-MKT', email: 'mkt@ptmmm.co', role: 'marketing', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','orders'] })
        const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', headers: { 'content-type': 'application/json', 'x-etl-token': 'TKN' }, body: JSON.stringify({ source: 'apps_script', sheet_name: 'Orders', rows: [] }) })
        const res = await POST(req)
        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.ok).toBe(false)
        expect(json.message).toBe('Forbidden')
      })

      it('403 ketika role tidak diizinkan (driver)', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] })
        const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', headers: { 'content-type': 'application/json', 'x-etl-token': 'TKN' }, body: JSON.stringify({ source: 'apps_script', sheet_name: 'Orders', rows: [] }) })
        const res = await POST(req)
        expect(res.status).toBe(403)
      })
    })

    describe('Valid Role', () => {
      it('200 ketika token benar dan role admin', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-ADM', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','orders','shipments','reports'] })
        const body = { source: 'apps_script', sheet_name: 'Orders', rows: [{ order_code: 'ORD-1' }, { order_code: 'ORD-2' }] }
        const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', headers: { 'content-type': 'application/json', 'x-etl-token': 'TKN' }, body: JSON.stringify(body) })
        const res = await POST(req)
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.ok).toBe(true)
        expect(json.import_id).toBe('IMP-999')
        expect(json.rows).toBe(2)
        expect((importSpreadsheet as any).mock.calls.length).toBe(1)
        const payload = (importSpreadsheet as any).mock.calls[0][0]
        expect(payload).toMatchObject({ source: 'apps_script', sheetName: 'Orders' })
        expect(Array.isArray(payload.rows)).toBe(true)
      })

      it('200 ketika token benar dan role ops', async () => {
        ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] })
        const body = { source: 'apps_script', sheet_name: 'Orders', rows: [{ order_code: 'ORD-3' }, { order_code: 'ORD-4' }] }
        const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', headers: { 'content-type': 'application/json', 'x-etl-token': 'TKN' }, body: JSON.stringify(body) })
        const res = await POST(req)
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.ok).toBe(true)
        expect(json.rows).toBe(2)
      })
    })
  })

  describe('ETL Token Validation', () => {
    it('401 ketika tidak menyertakan token', async () => {
      ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-ADM', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','orders','shipments','reports'] })
      const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('403 ketika token salah/invalid', async () => {
      ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-ADM', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','orders','shipments','reports'] })
      const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', headers: { 'content-type': 'application/json', 'x-etl-token': 'WRONG' }, body: JSON.stringify({}) })
      const res = await POST(req)
      expect(res.status).toBe(403)
    })

    it('403 ketika token benar tetapi role tidak diizinkan', async () => {
      ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-MKT', email: 'mkt@ptmmm.co', role: 'marketing', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','orders'] })
      const req = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', headers: { 'content-type': 'application/json', 'x-etl-token': 'TKN' }, body: JSON.stringify({}) })
      const res = await POST(req)
      expect(res.status).toBe(403)
    })
  })
})