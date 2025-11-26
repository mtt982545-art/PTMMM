import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn() }
})

vi.mock('@/lib/services/admin-dashboard-service', () => {
  return { getAdminSummary: vi.fn().mockResolvedValue({ organizations: 1, activeWarehouses: 2, usersByRole: { admin: 1 } }) }
})

vi.mock('@/lib/services/marketing-dashboard-service', () => {
  return { getRecentOrdersForUser: vi.fn().mockResolvedValue([]) }
})

vi.mock('@/lib/services/analytics-service', () => {
  return { getAnalyticsOverviewForUser: vi.fn().mockResolvedValue({ data: [], kpi: { gate_in: 1, gate_out: 1, load_start: 1, load_finish: 1, scans: 2, on_time_delivery: 95 } }) }
})

vi.mock('@/lib/services/route-service', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getRouteWithStopsAndItems: vi.fn().mockResolvedValue({ id: 'R1', code: 'RT-001', status: 'on_route', stops: [], shipments: [], route_path: ['WH-A','WH-B'], active_leg_index: 0 }) }
})

vi.mock('@/lib/services/tracking-service', () => {
  return { getTrackingTimeline: vi.fn().mockResolvedValue({ token: 'FORM-OPS-001', shipment_id: 'SHP-DRV-1', status: 'In Transit', events: [], estimated_delivery: null }) }
})

vi.mock('@/lib/services/shipments-service', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    getShipmentRouteInfoForOps: vi.fn().mockResolvedValue({ route_path: ['WH-A','WH-B'], current_leg_index: 0 }),
    getShipmentRouteInfoForSecurity: vi.fn().mockResolvedValue({ route_path: ['WH-A','WH-B'], current_leg_index: 0 }),
    getShipmentRouteInfoForDriver: vi.fn().mockResolvedValue({ route_path: ['WH-A','WH-B'], current_leg_index: 0 }),
    getShipmentRouteInfoForAdmin: vi.fn().mockResolvedValue({ route_path: ['WH-A','WH-B'], current_leg_index: 0 }),
  }
})

import { getServerUserContext } from '@/lib/auth/server-auth'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'
import { getRouteWithStopsAndItems } from '@/lib/services/route-service'
import { getTrackingTimeline } from '@/lib/services/tracking-service'
import { getShipmentRouteInfoForOps, getShipmentRouteInfoForSecurity, getShipmentRouteInfoForDriver } from '@/lib/services/shipments-service'

import AdminPage from '@/app/admin/page'
import MarketingDashboardPage from '@/app/dashboard/marketing/page'
import OpsLoadPage from '@/app/ops/load/page'
import SecurityGatePage from '@/app/security/gate/page'
import DriverHomePage from '@/app/driver/home/page'

describe('Dashboard service calls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Admin dashboard memanggil analytics, route-service, dan tracking timeline', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-ADM', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: ['WH-A'], orgId: 'PTMMM', sectionsAllowed: ['kpi','events','shipments','reports'] })
    await AdminPage({ searchParams: { route: 'RT-001', token: 'FORM-OPS-001' } } as any)
    expect(getAnalyticsOverviewForUser).toHaveBeenCalled()
    expect(getRouteWithStopsAndItems).toHaveBeenCalledWith('RT-001')
    expect(getTrackingTimeline).toHaveBeenCalledWith('FORM-OPS-001')
  })

  it('Ops dashboard memanggil shipments-service ops saat ship diberikan', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: ['WH-A'], orgId: 'PTMMM', sectionsAllowed: ['kpi','events','shipments'] })
    await OpsLoadPage({ searchParams: { ship: 'SHP-OPS-1' } } as any)
    expect(getShipmentRouteInfoForOps).toHaveBeenCalledWith(expect.any(Object), 'SHP-OPS-1')
  })

  it('Marketing dashboard memanggil shipments-service admin saat ship diberikan', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-MKT', email: 'marketing@ptmmm.co', role: 'marketing', warehouseIds: ['WH-A'], orgId: 'PTMMM', sectionsAllowed: ['kpi','orders','shipments'] })
    await MarketingDashboardPage({ searchParams: { ship: 'SHP-MKT-1' } } as any)
    const { getShipmentRouteInfoForAdmin } = await import('@/lib/services/shipments-service')
    expect(getShipmentRouteInfoForAdmin).toHaveBeenCalledWith(expect.any(Object), 'SHP-MKT-1')
  })

  it('Security dashboard memanggil shipments-service security saat ship diberikan', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-SEC', email: 'sec@ptmmm.co', role: 'security', warehouseIds: ['WH-A'], orgId: 'PTMMM', sectionsAllowed: ['events'] })
    await SecurityGatePage({ searchParams: { ship: 'SHP-SEC-1' } } as any)
    expect(getShipmentRouteInfoForSecurity).toHaveBeenCalledWith(expect.any(Object), 'SHP-SEC-1')
  })

  it('Driver dashboard memanggil tracking timeline dan shipments-service driver', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'PTMMM', sectionsAllowed: ['shipments'] })
    await DriverHomePage({} as any)
    expect(getTrackingTimeline).toHaveBeenCalled()
    expect(getShipmentRouteInfoForDriver).toHaveBeenCalled()
  })
})
