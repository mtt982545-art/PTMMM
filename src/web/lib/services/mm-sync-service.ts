import { MmApiClient, createMmApiClientFromEnv } from '@/lib/mm-api/client'
import { ShipmentDTO, RouteProgressDTO, ScanEventDTO, DriverLocationDTO, AnalyticsOverviewDTO, RouteDTO } from '@/lib/mm-api/dto'
import { MmApiError } from '@/lib/mm-api/errors'

export interface MmSyncService {
  syncShipment: (s: ShipmentDTO) => Promise<void>
  syncRoute: (r: RouteDTO) => Promise<void>
  syncRouteProgress: (p: RouteProgressDTO) => Promise<void>
  syncScanEventAndProgress: (e: ScanEventDTO, p?: RouteProgressDTO) => Promise<void>
  syncDriverLocation: (d: DriverLocationDTO) => Promise<void>
  fetchAnalyticsOverview: (orgId: string, warehouseIds: string[], from: string, to: string) => Promise<AnalyticsOverviewDTO>
}

function createNoopService(): MmSyncService {
  return {
    async syncShipment() {},
    async syncRoute() {},
    async syncRouteProgress() {},
    async syncScanEventAndProgress() {},
    async syncDriverLocation() {},
    async fetchAnalyticsOverview(orgId, warehouseIds, from, to) {
      return { orgId, warehouseIds, from, to, totalShipments: 0, onTimeRate: 0, avgDwellTimeMin: 0, scanSuccessRate: 0, routeLegCompletionRate: 0 }
    },
  }
}

export function createMmSyncService(mmClient?: MmApiClient): MmSyncService {
  const enabled = String(process.env.MM_SYNC_ENABLED ?? 'true').toLowerCase() !== 'false'
  if (!enabled) return createNoopService()
  const client = mmClient ?? createMmApiClientFromEnv()
  return {
    async syncShipment(s) {
      await client.upsertShipment(s)
    },
    async syncRoute(r) {
      await client.upsertRoute(r)
    },
    async syncRouteProgress(p) {
      await client.pushRouteProgress(p)
    },
    async syncScanEventAndProgress(e, p) {
      try {
        await client.ackScanEvent(e)
      } catch (err) {
        const dup = err instanceof MmApiError && err.status === 409
        if (!dup) throw err
      }
      if (p) {
        await client.pushRouteProgress(p)
      }
    },
    async syncDriverLocation(d) {
      await client.pushDriverGps(d)
    },
    async fetchAnalyticsOverview(orgId, warehouseIds, from, to) {
      return client.getAnalyticsOverview(orgId, warehouseIds, from, to)
    },
  }
}
