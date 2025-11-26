import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn().mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] }) }
})

// Mock Prisma to drive multi-warehouse route_path + current_leg_index
let mockActiveIndex = 0
const baseStops = [
  { id: 'RS-A', stopSeq: 0, warehouseId: 'WH-A', plannedArrival: null, plannedDeparture: null, shipmentItems: [ { collyCount: 10, weightKg: null, volumeM3: null } ], scanEvents: [] },
  { id: 'RS-B', stopSeq: 1, warehouseId: 'WH-B', plannedArrival: null, plannedDeparture: null, shipmentItems: [ { collyCount: 5, weightKg: null, volumeM3: null } ], scanEvents: [] },
  { id: 'RS-C', stopSeq: 2, warehouseId: 'WH-C', plannedArrival: null, plannedDeparture: null, shipmentItems: [ { collyCount: 2, weightKg: null, volumeM3: null } ], scanEvents: [] },
]

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      route: {
        findFirst: vi.fn().mockImplementation(async (args: any) => {
          if (!args?.where?.code || args.where.code !== 'RT-ABC') return null
          return {
            id: 'R-ABC',
            code: 'RT-ABC',
            status: 'on_route',
            stops: baseStops,
            shipments: [
              { id: 'SH-1', shipmentId: 'SH-1', status: 'in_transit', routePath: ['WH-A','WH-B','WH-C'], currentLegIndex: mockActiveIndex },
            ],
          }
        }),
      },
    },
  }
})

import { GET } from '@/app/api/route/[code]/route'

describe('API /api/route/[code] - Multi-warehouse enrichment', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('A→B→C with activeLegIndex=0 → statuses [completed, active, pending]', async () => {
    mockActiveIndex = 0
    const res = await GET(new Request('http://localhost/api/route/RT-ABC'), { params: { code: 'RT-ABC' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.code).toBe('RT-ABC')
    expect(json.data.route_path).toEqual(['WH-A','WH-B','WH-C'])
    const statuses = json.data.stops.map((s: any) => s.status)
    expect(statuses).toEqual(['completed','active','pending'])
  })

  it('A→B→C with activeLegIndex=1 → statuses [completed, completed, active]', async () => {
    mockActiveIndex = 1
    const res = await GET(new Request('http://localhost/api/route/RT-ABC'), { params: { code: 'RT-ABC' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    const statuses = json.data.stops.map((s: any) => s.status)
    expect(statuses).toEqual(['completed','completed','active'])
  })

  it('A→B→C with activeLegIndex=2 → statuses [completed, completed, completed]', async () => {
    mockActiveIndex = 2
    const res = await GET(new Request('http://localhost/api/route/RT-ABC'), { params: { code: 'RT-ABC' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    const statuses = json.data.stops.map((s: any) => s.status)
    expect(statuses).toEqual(['completed','completed','completed'])
  })
})
