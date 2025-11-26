import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { UserContext } from '@/lib/types'
import { createMmSyncService } from '@/lib/services/mm-sync-service'
import { resolveShipmentId } from '@/lib/services/shipments-service'
import { AppError } from '@/lib/errors'

const GpsPingSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  speed: z.number().optional(),
  qrTicketId: z.string().optional(),
  shipmentId: z.string().optional(),
  ts: z.string().optional(),
})

export type GpsPingInput = z.infer<typeof GpsPingSchema>

export function parseGpsPing(data: unknown): GpsPingInput {
  return GpsPingSchema.parse(data as GpsPingInput)
}

async function validateGpsShipment(ctx: UserContext, parsed: GpsPingInput) {
  const sid = parsed.shipmentId
  if (!sid) return
  const looksUuid = sid.length === 36 && sid.includes('-')
  let rows: Array<{ status: string }> = []
  if (looksUuid) {
    rows = await prisma.$queryRaw<Array<{ status: string }>>`SELECT status FROM shipments WHERE id = ${sid} AND organization_id = ${ctx.orgId} LIMIT 1`
  } else {
    rows = await prisma.$queryRaw<Array<{ status: string }>>`SELECT status FROM shipments WHERE shipment_id = ${sid} AND organization_id = ${ctx.orgId} LIMIT 1`
  }
  const stRaw = rows[0]?.status
  const st = typeof stRaw === 'string' ? stRaw.toLowerCase() : ''
  if (!st) throw new AppError(404, 'Not found')
  if (st === 'delivered') throw new AppError(400, 'Invalid shipment')
}

export async function insertGpsPing(ctx: UserContext, parsed: GpsPingInput) {
  const lat = Number.isFinite(parsed.lat) ? parsed.lat : 0
  const lng = Number.isFinite(parsed.lng) ? parsed.lng : 0
  const speed = typeof parsed.speed === 'number' ? (Number.isFinite(parsed.speed) ? parsed.speed : 0) : null
  const ts = parsed.ts ? new Date(parsed.ts) : new Date()
  const shipInternalId = await resolveShipmentId(parsed.shipmentId)
  return (prisma as any).trackingPing.create({
    data: {
      organizationId: ctx.orgId!,
      userId: ctx.id,
      qrTicketId: parsed.qrTicketId ?? null,
      shipmentId: shipInternalId,
      lat,
      lng,
      speed,
      ts,
    },
  })
}

export async function createGpsPing(ctx: UserContext, data: GpsPingInput) {
  const parsed = parseGpsPing(data)
  await validateGpsShipment(ctx, parsed)
  const rec = await insertGpsPing(ctx, parsed)
  try {
    const mmSync = createMmSyncService()
    const at = parsed.ts ? new Date(parsed.ts).toISOString() : new Date().toISOString()
    await mmSync.syncDriverLocation({ driverId: ctx.id, routeId: undefined, orgId: ctx.orgId!, warehouseId: undefined, lat: parsed.lat, lng: parsed.lng, speed: typeof parsed.speed === 'number' ? parsed.speed : undefined, at })
  } catch {}
  return rec
}
