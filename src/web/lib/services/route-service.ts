import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface RouteStopSummary {
  id: string
  stop_seq: number
  warehouse_id: string
  planned_arrival: string | null
  planned_departure: string | null
  items: {
    count: number
    colly_total: number
    weight_kg_total: string | null
    volume_m3_total: string | null
  }
  scan_event_count: number
  status?: 'completed' | 'active' | 'pending'
}

export interface RouteDetails {
  id: string
  code: string
  status: string
  stops: RouteStopSummary[]
  shipments: { id: string; shipment_id: string; status: string }[]
  route_path?: string[]
  active_leg_index?: number
}

/**
 * Bangun route_path dari urutan RouteStop (warehouseId) yang sudah diurutkan.
 */
export function buildRoutePathFromStops(stops: Array<{ warehouseId: string }>): string[] {
  return Array.isArray(stops) ? stops.map((s) => s.warehouseId) : []
}

/**
 * Hitung indeks leg aktif secara global dari daftar shipments.
 * Menggunakan nilai maksimum dari Shipment.currentLegIndex, lalu clamp ke [0..routePathLength-1].
 */
export function computeActiveLegIndex(
  shipments: Array<{ currentLegIndex?: number | null }>,
  routePathLength: number
): number {
  const maxLen = Math.max(routePathLength - 1, 0)
  if (!Array.isArray(shipments) || shipments.length === 0) return 0
  const maxIndexRaw = Math.max(
    ...shipments.map((sh) => (typeof sh.currentLegIndex === 'number' ? sh.currentLegIndex! : 0))
  )
  return Math.min(Math.max(maxIndexRaw, 0), maxLen)
}

/**
 * Tentukan status stop berdasarkan posisi warehouse pada route_path dan active_leg_index.
 * Jika warehouse tidak ditemukan pada route_path, kembalikan 'pending' agar prediktif.
 */
export function deriveStopStatusForWarehouse(
  warehouseId: string,
  routePath: string[],
  activeLegIndex: number
): 'completed' | 'active' | 'pending' {
  const pos = routePath.indexOf(warehouseId)
  if (pos < 0) return 'pending'
  if (pos <= activeLegIndex) return 'completed'
  if (pos === activeLegIndex + 1) return 'active'
  return 'pending'
}

export async function getRouteWithStopsAndItems(code: string): Promise<RouteDetails | null> {
  const route = await prisma.route.findFirst({
    where: { code },
    include: {
      stops: {
        orderBy: { stopSeq: 'asc' },
        include: {
          shipmentItems: true,
          scanEvents: { select: { id: true } },
        },
      },
      shipments: true,
    },
  })
  if (!route) return null

  const routePath = buildRoutePathFromStops(route.stops)

  const activeLegIndex = computeActiveLegIndex(route.shipments as any, routePath.length)

  const stops: RouteStopSummary[] = route.stops.map((s) => {
    const toDec = (v: any) => new Prisma.Decimal(v && typeof v === 'object' ? v.toString() : v ?? 0)
    const collyTotal = s.shipmentItems.reduce((sum, i) => sum + (i.collyCount || 0), 0)
    const weightTotal = s.shipmentItems.reduce(
      (sum, i) => sum.add(i.weightKg ? toDec(i.weightKg) : new Prisma.Decimal(0)),
      new Prisma.Decimal(0)
    )
    const volumeTotal = s.shipmentItems.reduce(
      (sum, i) => sum.add(i.volumeM3 ? toDec(i.volumeM3) : new Prisma.Decimal(0)),
      new Prisma.Decimal(0)
    )

    const status = deriveStopStatusForWarehouse(s.warehouseId, routePath, activeLegIndex)
    return {
      id: s.id,
      stop_seq: s.stopSeq,
      warehouse_id: s.warehouseId,
      planned_arrival: s.plannedArrival ? s.plannedArrival.toISOString() : null,
      planned_departure: s.plannedDeparture ? s.plannedDeparture.toISOString() : null,
      items: {
        count: s.shipmentItems.length,
        colly_total: collyTotal,
        weight_kg_total: weightTotal.toString(),
        volume_m3_total: volumeTotal.toString(),
      },
      scan_event_count: s.scanEvents.length,
      status,
    }
  })

  const shipments = route.shipments.map((sh: any) => ({ id: sh.id, shipment_id: sh.shipmentId, status: sh.status }))

  return { id: route.id, code: route.code, status: route.status, stops, shipments, route_path: routePath, active_leg_index: activeLegIndex }
}

export interface ShipmentItemsDetail {
  id: string
  shipment_id: string
  items: Array<{
    id: string
    product_code: string
    product_name: string | null
    uom: string | null
    colly_count: number
    weight_kg: string | null
    volume_m3: string | null
    warehouse_id: string
    route_stop_seq: number | null
  }>
}

export async function getShipmentItemsByShipmentCode(shipmentCode: string): Promise<ShipmentItemsDetail | null> {
  const shipment = await prisma.shipment.findFirst({
    where: { shipmentId: shipmentCode },
    include: {
      items: {
        include: { routeStop: true },
      },
    },
  })
  if (!shipment) return null

  const items = shipment.items.map((i) => ({
    id: i.id,
    product_code: i.productCode,
    product_name: i.productName ?? null,
    uom: i.uom ?? null,
    colly_count: i.collyCount,
    weight_kg: i.weightKg ? i.weightKg.toString() : null,
    volume_m3: i.volumeM3 ? i.volumeM3.toString() : null,
    warehouse_id: i.warehouseId,
    route_stop_seq: i.routeStop ? i.routeStop.stopSeq : null,
  }))

  return { id: shipment.id, shipment_id: shipment.shipmentId, items }
}
