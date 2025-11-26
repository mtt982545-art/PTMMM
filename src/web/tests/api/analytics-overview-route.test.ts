import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    getServerUserContext: vi.fn(),
  }
})

vi.mock('@/lib/services/analytics-service', () => {
  return {
    getAnalyticsOverviewForUser: vi.fn(),
  }
})

// Fallback mock untuk prisma jika route lama masih dipakai oleh resolver
vi.mock('@/lib/prisma', () => {
  const rows = [
    { id: 'E1', eventType: 'gate_in', createdAt: new Date(), ts: new Date() },
  ]
  const prisma = { scanEvent: { findMany: vi.fn().mockResolvedValue(rows) }, $queryRaw: vi.fn() }
  return { default: prisma, prisma }
})

import { getServerUserContext } from '@/lib/auth/server-auth'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'
import { GET as GET_ENTRY } from '@/app/api/analytics/overview/route'
// GET diimpor dinamis per test case untuk memastikan module mock berlaku

const sample = {
  data: [
    { day: '2025-01-01', gate_in: 1, gate_out: 0, load_start: 0, load_finish: 0, scans: 1 },
  ],
  kpi: { gate_in: 1, gate_out: 0, load_start: 0, load_finish: 0, scans: 1, on_time_delivery: 98.5 },
}

describe('API /api/analytics/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // 401: tidak ada session Supabase
  it('401 jika tidak ada sesi Supabase', async () => {
    ;(getServerUserContext as any).mockResolvedValue(null)
    const res = await GET_ENTRY()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Unauthorized')
  })

  // 403: ada session tapi tidak punya izin 'kpi'
  it('403 jika role tidak punya izin KPI', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-SEC', email: 'sec@ptmmm.co', role: 'security', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['events'] })
    const res = await GET_ENTRY()
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Forbidden')
  })

  // 200: punya izin 'kpi' namun tidak 'events' → data kosong, kpi penuh
  it('200 dengan KPI penuh dan data events kosong jika tidak ada izin events', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-MKT', email: 'mkt@ptmmm.co', role: 'marketing', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi'] })
    ;(getAnalyticsOverviewForUser as any).mockResolvedValue(sample)
    const res = await GET_ENTRY()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.kpi).toEqual(sample.kpi)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data.length).toBe(0)
  })

  // 200: punya izin 'kpi' dan 'events' → data & kpi penuh
  it('200 dengan KPI & events penuh jika izin keduanya ada', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-ADM', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events'] })
    ;(getAnalyticsOverviewForUser as any).mockResolvedValue(sample)
    const res = await GET_ENTRY()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.kpi).toEqual(sample.kpi)
    expect(json.data).toEqual(sample.data)
  })
})