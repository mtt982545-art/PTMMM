import { prisma } from '@/lib/prisma'
import { getShipmentDocumentsForSecurity } from '@/lib/services/documents-service'
import { isInOrgWarehouseScope } from '@/lib/auth/server-auth'
import type { UserContext } from '@/lib/types'

export async function getGateViewByShipmentOrToken(input: { shipmentId?: string; token?: string }, ctx?: UserContext | null) {
  let shipmentInternalId: string | null = null
  if (input.token) {
    try {
      const qr = await prisma.qrTicket.findFirst({ where: { token: input.token }, select: { shipmentId: true } })
      shipmentInternalId = qr?.shipmentId || null
    } catch {}
  }
  if (!shipmentInternalId && input.shipmentId) {
    try {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM shipments WHERE shipment_id = ${input.shipmentId} LIMIT 1`
      shipmentInternalId = rows[0]?.id || null
    } catch {}
  }
  if (!shipmentInternalId) return null
  const sh = await prisma.shipment.findUnique({ where: { id: shipmentInternalId }, select: { shipmentId: true, origin: true, destination: true, organizationId: true, warehouseId: true } })
  if (ctx) {
    const ok = isInOrgWarehouseScope(ctx, sh?.organizationId, sh?.warehouseId)
    if (!ok) return null
  }
  const items = await prisma.shipmentItem.findMany({ where: { shipmentId: shipmentInternalId }, select: { warehouseId: true, productCode: true, productName: true, qtyUnit: true, uom: true } })
  const docs = await getShipmentDocumentsForSecurity(shipmentInternalId)
  let driver: any = null
  let vehicle: any = null
  if (docs.scheduleDoc?.refCode) {
    const schedId = docs.scheduleDoc.refCode
    try {
      const sched = await (prisma as any).routeSchedule.findUnique({ where: { id: schedId }, select: { driverProfileId: true, vehicleId: true, startAt: true, endAt: true } })
      if (sched?.driverProfileId) driver = await prisma.driverProfile.findUnique({ where: { id: sched.driverProfileId }, select: { name: true, phone: true } })
      if (sched?.vehicleId) vehicle = await prisma.vehicle.findUnique({ where: { id: sched.vehicleId }, select: { plateNumber: true, name: true, type: true } })
    } catch {}
  }
  return { shipment: sh, items, docs, driver, vehicle }
}
