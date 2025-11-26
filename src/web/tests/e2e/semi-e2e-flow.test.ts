import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn().mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: ['WH-SDA','WH-NGJ','WH-SGS','WH-SRG'], orgId: 'PTMMM', sectionsAllowed: ['kpi','events','shipments'] }) }
})

const events: any[] = []

vi.mock('@/lib/services/etl-service', () => {
  return {
    importSpreadsheet: vi.fn(async (payload: any) => {
      return { importId: 'IMP-E2E-1', rows: Array.isArray(payload?.rows) ? payload.rows.length : 0 }
    })
  }
})

vi.mock('@/lib/services/scan-service', () => {
  return {
    createScanEvent: vi.fn(async (body: any) => {
      const rec = { id: `EVT-${events.length + 1}`, ...body, ts: new Date() }
      events.push(rec)
      return { id: rec.id }
    })
  }
})

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      scanEvent: {
        findMany: vi.fn(async (args: any) => {
          const token = args?.where?.OR?.[0]?.shipmentId || args?.where?.OR?.[1]?.formCode
          const seed = [
            { id: 'SEED-1', eventType: 'gate_in', ts: new Date(Date.now() - 1000 * 60 * 60 * 3), payload: { location: 'WH-SDA', description: 'Gate in Sidoarjo' }, warehouseId: 'WH-SDA', refType: 'Gate' },
            { id: 'SEED-2', eventType: 'load_start', ts: new Date(Date.now() - 1000 * 60 * 60 * 2), payload: { location: 'WH-SDA', description: 'Mulai muat di Sidoarjo' }, warehouseId: 'WH-SDA', refType: 'Warehouse' },
          ]
          const scanInjected = events.filter((e) => e.formCode === token || e.shipmentId === token).map((e) => ({ id: e.id, eventType: e.eventType, ts: new Date(), payload: e.payload ?? {}, warehouseId: e.warehouseId ?? 'WH-SDA', refType: e.refType ?? 'Scan' }))
          return [...seed, ...scanInjected]
        })
      }
    }
  }
})

vi.mock('@/lib/services/route-service', () => {
  return {
    getRouteWithStopsAndItems: vi.fn().mockResolvedValue({ id: 'R-DEMO', code: 'RT-SDA-NGJ-SGS-SRG-001', status: 'on_route', stops: [
      { id: 'S1', stop_seq: 1, warehouse_id: 'WH-SDA', planned_arrival: new Date().toISOString(), planned_departure: new Date().toISOString(), items: { count: 1, colly_total: 8, weight_kg_total: '120', volume_m3_total: '0.9' }, scan_event_count: 1 },
      { id: 'S2', stop_seq: 2, warehouse_id: 'WH-NGJ', planned_arrival: new Date().toISOString(), planned_departure: new Date().toISOString(), items: { count: 1, colly_total: 6, weight_kg_total: '90', volume_m3_total: '0.7' }, scan_event_count: 1 },
    ], shipments: [ { id: 'SHP-ROUTE-001-ID', shipment_id: 'SHP-ROUTE-001', status: 'in_transit' } ] })
  }
})

vi.mock('@/lib/services/analytics-service', () => {
  return {
    getAnalyticsOverviewForUser: vi.fn(async (_ctx: any) => {
      const day = new Date().toISOString().slice(0, 10)
      const gateIn = 1
      const loadStart = 1
      const scans = events.length > 0 ? 1 : 0
      return {
        data: [{ day, gate_in: gateIn, gate_out: 0, load_start: loadStart, load_finish: 0, scans }],
        kpi: { gate_in: gateIn, gate_out: 0, load_start: loadStart, load_finish: 0, scans, on_time_delivery: 98.5 }
      }
    })
  }
})

import { POST as ETL_POST } from '@/app/api/etl/spreadsheet/route'
import { POST as SCAN_POST } from '@/app/api/scan/route'
import { GET as TRACK_GET } from '@/app/api/tracking/[token]/route'
import { GET as ROUTE_GET } from '@/app/api/route/[code]/route'
import { GET as ANALYTICS_GET } from '@/app/api/analytics/overview/route'

describe('E2E Semi Lengkap: ETL → Scan → Tracking → Route → Analytics', () => {
  beforeEach(() => {
    events.length = 0
    vi.clearAllMocks()
    process.env.ETL_WRITE_TOKEN = 'ETL-TKN'
    process.env.SCAN_WRITE_TOKEN = 'SCAN-TKN'
  })

  it('mengalirkan data sesuai seed & helper RBAC', async () => {
    const etlBody = { source: 'apps_script', sheet_name: 'Shipments', rows: [{ shipment_id: 'SHP-001' }, { shipment_id: 'SHP-ROUTE-001' }] }
    const etlReq = new Request('http://localhost/api/etl/spreadsheet', { method: 'POST', headers: { 'content-type': 'application/json', 'x-etl-token': 'ETL-TKN' }, body: JSON.stringify(etlBody) })
    const etlRes = await ETL_POST(etlReq)
    expect(etlRes.status).toBe(200)

    const scanBody = { eventType: 'scan', shipmentId: 'SHP-ROUTE-001', formCode: 'QR-SHP-ROUTE-001-DEMO', payload: { location: 'Checkpoint' } }
    const scanReq = new Request('http://localhost/api/scan', { method: 'POST', headers: { 'content-type': 'application/json', 'x-scan-token': 'SCAN-TKN' }, body: JSON.stringify(scanBody) })
    const scanRes = await SCAN_POST(scanReq)
    expect(scanRes.status).toBe(200)

    const trackRes = await TRACK_GET(new Request('http://localhost/api/tracking/FORM-OPS-001'), { params: { token: 'FORM-OPS-001' } })
    expect(trackRes.status).toBe(200)
    const trackJson = await trackRes.json()
    expect(trackJson.ok).toBe(true)
    expect(Array.isArray(trackJson.data.events)).toBe(true)
    expect(trackJson.data.events.length).toBeGreaterThanOrEqual(2)

    const routeRes = await ROUTE_GET(new Request('http://localhost/api/route/RT-SDA-NGJ-SGS-SRG-001'), { params: { code: 'RT-SDA-NGJ-SGS-SRG-001' } })
    expect(routeRes.status).toBe(200)
    const routeJson = await routeRes.json()
    expect(routeJson.ok).toBe(true)
    expect(routeJson.data.code).toBe('RT-SDA-NGJ-SGS-SRG-001')
    expect(routeJson.data.shipments[0].shipment_id).toBe('SHP-ROUTE-001')

    const analyticsRes = await ANALYTICS_GET()
    expect(analyticsRes.status).toBe(200)
    const analyticsJson = await analyticsRes.json()
    expect(analyticsJson.ok).toBe(true)
    expect(analyticsJson.kpi.gate_in).toBeGreaterThanOrEqual(1)
    expect(analyticsJson.kpi.load_start).toBeGreaterThanOrEqual(1)
    expect(analyticsJson.kpi.scans).toBeGreaterThanOrEqual(1)
  })
})