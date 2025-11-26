export type IdString = string
export type ShipmentStatus = 'created' | 'planned' | 'loading' | 'in_transit' | 'completed' | 'canceled'
export interface ShipmentDTO {
  id: IdString
  erpRef?: IdString
  orgId: IdString
  warehouseId: IdString
  status: ShipmentStatus
  routePath: string[]
  currentLegIndex: number
  badges?: string[]
  createdAt: string
  updatedAt: string
  plannedDepartureAt?: string
  plannedArrivalAt?: string
}
export type RouteStatus = 'planned' | 'active' | 'paused' | 'completed' | 'canceled'
export interface RouteDTO {
  id: IdString
  orgId: IdString
  warehouseId: IdString
  routePath: string[]
  currentLegIndex: number
  status: RouteStatus
}
export type ScanEventType = 'load' | 'unload' | 'gate_in' | 'gate_out' | 'handover' | 'pod' | 'scan'
export interface ScanEventDTO {
  id: IdString
  shipmentId: IdString
  routeId?: IdString
  scannerUserId: IdString
  orgId: IdString
  warehouseId: IdString
  scanToken: string
  eventType: ScanEventType
  at: string
  meta?: Record<string, unknown>
  deviceId?: string
}
export interface RouteProgressDTO {
  routeId: IdString
  shipmentId?: IdString
  currentLegIndex: number
  status: RouteStatus
  at: string
}
export interface DriverLocationDTO {
  driverId: IdString
  routeId?: IdString
  orgId: IdString
  warehouseId?: IdString
  lat: number
  lng: number
  accuracy?: number
  speed?: number
  heading?: number
  at: string
}
export interface AnalyticsOverviewDTO {
  orgId: IdString
  warehouseIds: IdString[]
  from: string
  to: string
  totalShipments: number
  onTimeRate: number
  avgDwellTimeMin: number
  scanSuccessRate: number
  routeLegCompletionRate: number
}
export interface MmShipmentPayload {
  externalId: IdString
  orgId: IdString
  warehouseId: IdString
  status: ShipmentStatus
  legs: string[]
  currentLegIndex: number
  timestamps: {
    createdAt: string
    updatedAt: string
    plannedDepartureAt?: string
    plannedArrivalAt?: string
  }
  badges?: string[]
}
export interface MmRoutePayload {
  externalId: IdString
  orgId: IdString
  warehouseId: IdString
  legs: string[]
  currentLegIndex: number
  status: RouteStatus
}
export interface MmScanEventPayload {
  eventId: IdString
  externalShipmentId: IdString
  externalRouteId?: IdString
  eventType: ScanEventType
  at: string
  scannerId: IdString
  warehouseId: IdString
  orgId: IdString
  metadata?: Record<string, unknown>
  deviceId?: string
}
export interface MmRouteProgressPayload {
  externalRouteId: IdString
  currentLegIndex: number
  status: RouteStatus
  at: string
  externalShipmentId?: IdString
}
export interface MmDriverLocationPayload {
  driverId: IdString
  externalRouteId?: IdString
  orgId: IdString
  warehouseId?: IdString
  lat: number
  lng: number
  accuracy?: number
  speed?: number
  heading?: number
  at: string
}
export interface MmAnalyticsOverviewResponse {
  orgId: IdString
  warehouseIds: IdString[]
  from: string
  to: string
  metrics: {
    totalShipments: number
    onTimeRate: number
    avgDwellTimeMin: number
    scanSuccessRate: number
    routeLegCompletionRate: number
  }
}
