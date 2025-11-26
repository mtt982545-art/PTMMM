import { prisma } from '@/lib/prisma'
import type { UserContext } from '@/lib/types'

export type CreateRouteScheduleInput = {
  warehouseId: string
  driverProfileId?: string
  vehicleId?: string
  routeId?: string
  shift?: string
  startAt?: string
  endAt?: string
  notes?: string
}

export async function createRouteSchedule(ctx: UserContext, input: CreateRouteScheduleInput) {
  const orgId = ctx.orgId
  const data: any = {
    organizationId: orgId,
    warehouseId: input.warehouseId,
    driverProfileId: input.driverProfileId || null,
    vehicleId: input.vehicleId || null,
    routeId: input.routeId || null,
    shift: input.shift || null,
    startAt: input.startAt ? new Date(input.startAt) : null,
    endAt: input.endAt ? new Date(input.endAt) : null,
    status: 'planned',
    notes: input.notes || null,
  }
  const rec = await (prisma as any).routeSchedule.create({ data })
  return rec
}

export async function listAvailableSchedulesForWarehouses(ctx: UserContext, warehouseIds: string[], fromIso?: string) {
  const from = fromIso ? new Date(fromIso) : new Date(Date.now() - 1000 * 60 * 60)
  const rows = await (prisma as any).routeSchedule.findMany({
    where: { organizationId: ctx.orgId, warehouseId: { in: warehouseIds }, status: 'planned', startAt: { gte: from } },
    orderBy: { startAt: 'asc' },
    select: { id: true, warehouseId: true, driverProfileId: true, vehicleId: true, routeId: true, shift: true, startAt: true, endAt: true },
  })
  const drivers = await prisma.driverProfile.findMany({ where: { id: { in: rows.map((r: any) => r.driverProfileId).filter(Boolean) } }, select: { id: true, name: true, phone: true } })
  const vehicles = await prisma.vehicle.findMany({ where: { id: { in: rows.map((r: any) => r.vehicleId).filter(Boolean) } }, select: { id: true, plateNumber: true, name: true, type: true } })
  const driverMap = new Map(drivers.map((d) => [d.id, d]))
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]))
  return rows.map((r: any) => ({ ...r, driver: r.driverProfileId ? driverMap.get(r.driverProfileId) || null : null, vehicle: r.vehicleId ? vehicleMap.get(r.vehicleId) || null : null }))
}
