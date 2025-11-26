import { MmApiError } from './errors'
import {
  ShipmentDTO,
  RouteDTO,
  ScanEventDTO,
  RouteProgressDTO,
  DriverLocationDTO,
  AnalyticsOverviewDTO,
  MmShipmentPayload,
  MmRoutePayload,
  MmScanEventPayload,
  MmRouteProgressPayload,
  MmDriverLocationPayload,
  MmAnalyticsOverviewResponse,
} from './dto'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface MmApiClientOptions {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
  retryMax?: number
  idempotencyPrefix?: string
}

export class MmApiClient {
  private baseUrl: string
  private apiKey: string
  private timeoutMs: number
  private retryMax: number
  private idempotencyPrefix: string

  constructor(opts: MmApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '')
    this.apiKey = opts.apiKey
    this.timeoutMs = opts.timeoutMs ?? 8000
    this.retryMax = opts.retryMax ?? 2
    this.idempotencyPrefix = opts.idempotencyPrefix ?? 'ptmmm'
  }

  async upsertShipment(s: ShipmentDTO) {
    const payload: MmShipmentPayload = {
      externalId: s.id,
      orgId: s.orgId,
      warehouseId: s.warehouseId,
      status: s.status,
      legs: s.routePath,
      currentLegIndex: s.currentLegIndex,
      timestamps: {
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        plannedDepartureAt: s.plannedDepartureAt,
        plannedArrivalAt: s.plannedArrivalAt,
      },
      badges: s.badges,
    }
    const idk = this.idk('shipment', s.orgId, s.warehouseId, s.id, s.updatedAt)
    return this.request<{ externalId: string }>('PUT', '/shipments', payload, idk)
  }

  async upsertRoute(r: RouteDTO) {
    const payload: MmRoutePayload = {
      externalId: r.id,
      orgId: r.orgId,
      warehouseId: r.warehouseId,
      legs: r.routePath,
      currentLegIndex: r.currentLegIndex,
      status: r.status,
    }
    const idk = this.idk('route', r.orgId, r.warehouseId, r.id, String(r.currentLegIndex))
    return this.request<{ externalId: string }>('PUT', '/routes', payload, idk)
  }

  async ackScanEvent(e: ScanEventDTO) {
    const payload: MmScanEventPayload = {
      eventId: e.id,
      externalShipmentId: e.shipmentId,
      externalRouteId: e.routeId,
      eventType: e.eventType,
      at: e.at,
      scannerId: e.scannerUserId,
      warehouseId: e.warehouseId,
      orgId: e.orgId,
      metadata: e.meta,
      deviceId: e.deviceId,
    }
    const idk = this.idk('scan', e.orgId, e.warehouseId, e.shipmentId, e.id)
    return this.request<{ acknowledged: boolean }>('POST', '/scan-events', payload, idk)
  }

  async pushRouteProgress(p: RouteProgressDTO) {
    const payload: MmRouteProgressPayload = {
      externalRouteId: p.routeId,
      currentLegIndex: p.currentLegIndex,
      status: p.status,
      at: p.at,
      externalShipmentId: p.shipmentId,
    }
    const idk = this.idk('route-progress', p.routeId, p.currentLegIndex, p.status, p.at)
    return this.request<{ accepted: boolean }>('POST', '/route-progress', payload, idk)
  }

  async pushDriverGps(d: DriverLocationDTO) {
    const payload: MmDriverLocationPayload = {
      driverId: d.driverId,
      externalRouteId: d.routeId,
      orgId: d.orgId,
      warehouseId: d.warehouseId,
      lat: d.lat,
      lng: d.lng,
      accuracy: d.accuracy,
      speed: d.speed,
      heading: d.heading,
      at: d.at,
    }
    const idk = this.idk('driver-gps', d.driverId, d.routeId ?? '', d.orgId, d.at)
    return this.request<{ accepted: boolean }>('POST', '/driver/locations', payload, idk)
  }

  async getAnalyticsOverview(orgId: string, warehouseIds: string[], from: string, to: string) {
    const qs = new URLSearchParams({ orgId, from, to, warehouseIds: warehouseIds.join(',') }).toString()
    const res = await this.request<MmAnalyticsOverviewResponse>('GET', `/analytics/overview?${qs}`)
    const m = res.metrics
    const dto: AnalyticsOverviewDTO = {
      orgId: res.orgId,
      warehouseIds: res.warehouseIds,
      from: res.from,
      to: res.to,
      totalShipments: m.totalShipments,
      onTimeRate: m.onTimeRate,
      avgDwellTimeMin: m.avgDwellTimeMin,
      scanSuccessRate: m.scanSuccessRate,
      routeLegCompletionRate: m.routeLegCompletionRate,
    }
    return dto
  }

  async listWarehouses(orgId: string) {
    return this.request<{ warehouses: { id: string; name: string }[] }>('GET', `/orgs/${orgId}/warehouses`)
  }

  private idk(...parts: Array<string | number | undefined | null>) {
    const raw = parts.filter(Boolean).join(':')
    return `${this.idempotencyPrefix}:${raw}`
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown, idempotencyKey?: string) {
    const url = `${this.baseUrl}${path}`
    let attempt = 0
    while (true) {
      const ac = new AbortController()
      const t = setTimeout(() => ac.abort(), this.timeoutMs)
      try {
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: ac.signal,
        })
        clearTimeout(t)
        const txt = await res.text()
        const isJson = res.headers.get('content-type')?.includes('application/json')
        const data = isJson && txt ? JSON.parse(txt) : (undefined as unknown as T)
        if (res.ok) return data as T
        const code = (data as any)?.code ?? 'MM_API_ERROR'
        const retryable = [429, 500, 502, 503, 504].includes(res.status)
        throw new MmApiError(`MM API ${method} ${path} failed`, res.status, code, data, retryable)
      } catch (err) {
        const retryable =
          err instanceof MmApiError
            ? err.retryable
            : err instanceof Error && err.name === 'AbortError'
        if (retryable && attempt < this.retryMax) {
          const wait = this.backoff(attempt)
          await this.sleep(wait)
          attempt++
          continue
        }
        if (err instanceof MmApiError) throw err
        throw new MmApiError(`MM API ${method} ${path} network error`, 0, 'NETWORK_ERROR', undefined, false)
      }
    }
  }

  private backoff(attempt: number) {
    const base = 300
    const jitter = Math.floor(Math.random() * 200)
    return base * (2 ** attempt) + jitter
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export function createMmApiClientFromEnv() {
  const baseUrl = process.env.MM_API_BASE_URL as string
  const apiKey = process.env.MM_API_KEY as string
  const timeoutMs = Number(process.env.MM_API_TIMEOUT_MS ?? 8000)
  const retryMax = Number(process.env.MM_API_RETRY_MAX ?? 2)
  const idempotencyPrefix = String(process.env.MM_API_IDEMPOTENCY_PREFIX ?? 'ptmmm')
  return new MmApiClient({ baseUrl, apiKey, timeoutMs, retryMax, idempotencyPrefix })
}
