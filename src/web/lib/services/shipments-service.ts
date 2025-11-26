import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '@/lib/errors'
import type { UserContext, AppRole, PermissionSection } from '@/lib/types'
import { ensureSectionAccess, requireRole } from '@/lib/auth/server-auth'
import { clampLegIndex, normalizeRoutePath } from '@/lib/domain/route-helpers'
import { createMmSyncService } from '@/lib/services/mm-sync-service'
import { upsertShipmentQrToken } from '@/lib/services/qr-token'

export interface ShipmentRecord {
  id: string
  shipment_id: string
  customer: string
  origin: string
  destination: string
  status: string
}

const ShipmentCreateSchema = z.object({
  shipment_id: z.string().min(1),
  customer: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  status: z.string().default('in_transit'),
})

const ShipmentUpdateSchema = z.object({
  customer: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  status: z.string().optional(),
  route_path: z.array(z.string()).optional(),
  current_leg_index: z.number().int().optional(),
})

export type ShipmentCreateInput = z.infer<typeof ShipmentCreateSchema>
export type ShipmentUpdateInput = z.infer<typeof ShipmentUpdateSchema>
export type DriverTaskProof = 'schedule' | 'tracking' | 'scan'
export type DriverTaskRecord = {
  shipment_id: string
  customer: string
  origin: string
  destination: string
  status: string
  proof: DriverTaskProof
}

export function parseShipmentCreate(data: unknown): ShipmentCreateInput {
  return ShipmentCreateSchema.parse(data)
}

export async function createShipment(input: ShipmentCreateInput): Promise<{ id: string }> {
  const d = parseShipmentCreate(input)
  await prisma.$executeRaw`INSERT INTO shipments (shipment_id, customer, origin, destination, status) VALUES (${d.shipment_id}, ${d.customer}, ${d.origin}, ${d.destination}, ${d.status})`
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM shipments WHERE shipment_id = ${d.shipment_id} LIMIT 1`
  if (!rows.length) throw new AppError(500, 'Shipment not created')
  return { id: rows[0].id }
}

export async function createShipmentWithAccess(ctx: UserContext, input: ShipmentCreateInput): Promise<{ id: string }> {
  assertAccessAny(ctx, ['admin','marketing'], [{ name: 'shipments', roles: ['admin','marketing'] }])
  const r = await createShipment(input)
  const scRows = await prisma.$queryRaw<Array<{ organization_id: string; warehouse_id: string }>>`SELECT organization_id, warehouse_id FROM shipments WHERE shipment_id = ${input.shipment_id} LIMIT 1`
  const sc = scRows[0]
  const token = `QR-${input.shipment_id}`
  try {
    await upsertShipmentQrToken({ token, organizationId: sc?.organization_id, warehouseId: sc?.warehouse_id, shipmentInternalId: r.id, createdBy: ctx.email })
  } catch {}
  try {
    const mmSync = createMmSyncService()
    const now = new Date().toISOString()
    await mmSync.syncShipment({ id: input.shipment_id, orgId: sc?.organization_id || ctx.orgId!, warehouseId: sc?.warehouse_id || (ctx.warehouseIds[0] || ''), status: 'in_transit', routePath: [], currentLegIndex: 0, createdAt: now, updatedAt: now })
  } catch {}
  return r
}

export async function getShipmentById(shipment_id: string): Promise<ShipmentRecord | null> {
  const rows = await prisma.$queryRaw<Array<ShipmentRecord>>`SELECT id, shipment_id, customer, origin, destination, status FROM shipments WHERE shipment_id = ${shipment_id} LIMIT 1`
  return rows[0] ?? null
}

export async function getShipmentByIdWithAccess(ctx: UserContext, shipment_id: string): Promise<ShipmentRecord | null> {
  // Read dengan guard dan scoping per role
  const base = await getShipmentById(shipment_id)
  if (!base) return null
  const scRows = await prisma.$queryRaw<Array<{ organization_id: string; warehouse_id: string }>>
    `SELECT organization_id, warehouse_id FROM shipments WHERE shipment_id = ${shipment_id} LIMIT 1`
  const sc = scRows[0]
  const r = { ...base, organization_id: sc?.organization_id, warehouse_id: sc?.warehouse_id } as any
  const inOrg = !!ctx.orgId && r.organization_id === ctx.orgId
  const inWh = Array.isArray(ctx.warehouseIds) && ctx.warehouseIds.length ? ctx.warehouseIds.includes(r.warehouse_id) : true
  if (requireRole(ctx, ['admin']) && ensureSectionAccess(ctx, 'shipments', ['admin'])) {
    if (!inOrg) throw new AppError(403, 'Forbidden')
  } else if (requireRole(ctx, ['ops']) && ensureSectionAccess(ctx, 'shipments', ['ops'])) {
    if (!inOrg || !inWh) throw new AppError(403, 'Forbidden')
  } else if (requireRole(ctx, ['security']) && ensureSectionAccess(ctx, 'events', ['security'])) {
    if (!inOrg || !inWh) throw new AppError(403, 'Forbidden')
  } else if (requireRole(ctx, ['driver']) && ensureSectionAccess(ctx, 'shipments', ['driver'])) {
    if (!inOrg) throw new AppError(403, 'Forbidden')
    const assigned = await isShipmentAssignedToDriver(ctx, shipment_id)
    if (!assigned) throw new AppError(403, 'Forbidden')
  } else {
    throw new AppError(403, 'Forbidden')
  }
  return base
}

export async function updateShipment(shipment_id: string, patch: ShipmentUpdateInput): Promise<ShipmentRecord | null> {
  const p = ShipmentUpdateSchema.parse(patch)
  const sets: Prisma.Sql[] = []
  if (p.customer) sets.push(Prisma.sql`customer = ${p.customer}`)
  if (p.origin) sets.push(Prisma.sql`origin = ${p.origin}`)
  if (p.destination) sets.push(Prisma.sql`destination = ${p.destination}`)
  if (p.status) sets.push(Prisma.sql`status = ${p.status}`)
  const routePathNormalized = p.route_path !== undefined ? normalizeRoutePath(p.route_path) : undefined
  const desiredIdxRaw = typeof p.current_leg_index === 'number' ? p.current_leg_index : undefined
  let idx: number | undefined = undefined
  if (desiredIdxRaw !== undefined) {
    let rpForClamp: string[] = []
    if (routePathNormalized !== undefined) {
      rpForClamp = routePathNormalized
    } else {
      const rows = await prisma.$queryRaw<Array<{ route_path: any }>>`SELECT route_path FROM shipments WHERE shipment_id = ${shipment_id} LIMIT 1`
      rpForClamp = rows.length ? normalizeRoutePath(rows[0].route_path) : []
    }
    idx = clampLegIndex(rpForClamp, desiredIdxRaw)
  }
  if (routePathNormalized !== undefined) sets.push(Prisma.sql`route_path = ${JSON.stringify(routePathNormalized)}`)
  if (idx !== undefined) sets.push(Prisma.sql`current_leg_index = ${idx}`)
  if (!sets.length) return getShipmentById(shipment_id)
  const q = Prisma.sql`UPDATE shipments SET ${Prisma.join(sets, ', ')} WHERE shipment_id = ${shipment_id}`
  await prisma.$executeRaw(q)
  return getShipmentById(shipment_id)
}

export async function updateShipmentWithAccess(ctx: UserContext, shipment_id: string, patch: ShipmentUpdateInput): Promise<ShipmentRecord | null> {
  if (requireRole(ctx, ['admin']) && ensureSectionAccess(ctx, 'shipments', ['admin'])) {
    return updateShipment(shipment_id, patch)
  }
  if (requireRole(ctx, ['marketing']) && ensureSectionAccess(ctx, 'shipments', ['marketing'])) {
    const cntRows = await prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*) AS c FROM scan_event WHERE shipment_id = ${shipment_id} AND event_type IN ('gate_in','load_start','load_finish','gate_out') LIMIT 1`
    const hasOpsScan = Number(cntRows[0]?.c || 0) > 0
    const allowed: ShipmentUpdateInput = hasOpsScan
      ? { customer: patch.customer, origin: patch.origin, destination: patch.destination, status: patch.status }
      : patch
    return updateShipment(shipment_id, allowed)
  }
  if (requireRole(ctx, ['ops']) && ensureSectionAccess(ctx, 'shipments', ['ops'])) {
    const allowed: ShipmentUpdateInput = { status: patch.status }
    return updateShipment(shipment_id, allowed)
  }
  throw new AppError(403, 'Forbidden')
}

export async function deleteShipment(shipment_id: string): Promise<boolean> {
  const affected = await prisma.$executeRaw`DELETE FROM shipments WHERE shipment_id = ${shipment_id}`
  return Number(affected) > 0
}

export async function deleteShipmentWithAccess(ctx: UserContext, shipment_id: string): Promise<boolean> {
  assertAccessAny(ctx, ['admin'], [{ name: 'shipments', roles: ['admin'] }])
  const canSee = await getShipmentByIdWithAccess(ctx, shipment_id)
  if (!canSee) throw new AppError(404, 'Not found')
  return deleteShipment(shipment_id)
}

const AdminRoutePatchSchema = z.object({
  route_path: z.array(z.string()).optional(),
  current_leg_index: z.number().int().min(0).optional(),
})

export type AdminRoutePatch = z.infer<typeof AdminRoutePatchSchema>

// Ambil route_path + current_leg_index lalu clamp untuk keamanan konsumsi lintas layanan/UI
async function getClampedRouteInternal(shipment_id: string): Promise<{ route_path: string[]; current_leg_index: number } | null> {
  const rows = await prisma.$queryRaw<Array<{ route_path: any; current_leg_index: number }>>`SELECT route_path, current_leg_index FROM shipments WHERE shipment_id = ${shipment_id} LIMIT 1`
  if (!rows.length) return null
  const rp = normalizeRoutePath(rows[0].route_path)
  const i = clampLegIndex(rp, rows[0].current_leg_index)
  return { route_path: rp, current_leg_index: i }
}

// Guard akses: role harus cocok dan minimal salah satu section diizinkan
function assertAccessAny(ctx: UserContext, roles: AppRole[], sectionsAny: Array<{ name: PermissionSection; roles: AppRole[] }>) {
  const allowed = requireRole(ctx, roles) && sectionsAny.some(s => ensureSectionAccess(ctx, s.name, s.roles))
  if (!allowed) throw new AppError(403, 'Forbidden')
}

export async function getShipmentRouteInfoForAdmin(ctx: UserContext, shipment_id: string): Promise<{ route_path: string[]; current_leg_index: number } | null> {
  return getShipmentRouteInfoWithAccess(ctx, ['admin','marketing'], [{ name: 'shipments', roles: ['admin','marketing'] }], shipment_id)
}

export async function updateShipmentRouteInfoForAdmin(ctx: UserContext, shipment_id: string, patch: AdminRoutePatch): Promise<{ route_path: string[]; current_leg_index: number } | null> {
  assertAccessAny(ctx, ['admin','marketing'], [{ name: 'shipments', roles: ['admin','marketing'] }])
  if (requireRole(ctx, ['marketing'])) {
    const cntRows = await prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*) AS c FROM scan_event WHERE shipment_id = ${shipment_id} AND event_type IN ('gate_in','load_start','load_finish','gate_out') LIMIT 1`
    if (Number(cntRows[0]?.c || 0) > 0) throw new AppError(403, 'Forbidden')
  }
  const p = AdminRoutePatchSchema.parse(patch)
  const rows = await prisma.$queryRaw<Array<{ route_path: any; current_leg_index: number }>>`SELECT route_path, current_leg_index FROM shipments WHERE shipment_id = ${shipment_id} LIMIT 1`
  if (!rows.length) return null
  const currentRp = normalizeRoutePath(rows[0].route_path)
  const rp = p.route_path !== undefined ? normalizeRoutePath(p.route_path) : currentRp
  const desiredIdxRaw = typeof p.current_leg_index === 'number' ? p.current_leg_index : rows[0].current_leg_index
  const idx = clampLegIndex(rp, desiredIdxRaw)
  await prisma.$executeRaw`UPDATE shipments SET route_path = ${JSON.stringify(rp)}, current_leg_index = ${idx} WHERE shipment_id = ${shipment_id}`
  return { route_path: rp, current_leg_index: idx }
}

export async function getShipmentRouteInfoForOps(ctx: UserContext, shipment_id: string): Promise<{ route_path: string[]; current_leg_index: number } | null> {
  return getShipmentRouteInfoWithAccess(ctx, ['ops'], [{ name: 'events', roles: ['ops'] }, { name: 'kpi', roles: ['ops'] }], shipment_id)
}

export async function getShipmentRouteInfoForDriver(ctx: UserContext, shipment_id: string): Promise<{ route_path: string[]; current_leg_index: number } | null> {
  const info = await getShipmentRouteInfoWithAccess(ctx, ['driver'], [{ name: 'shipments', roles: ['driver'] }], shipment_id)
  if (!info) return null
  const assigned = await isShipmentAssignedToDriver(ctx, shipment_id)
  if (!assigned) throw new AppError(403, 'Forbidden')
  return info
}

export async function getShipmentRouteInfoForSecurity(ctx: UserContext, shipment_id: string): Promise<{ route_path: string[]; current_leg_index: number } | null> {
  return getShipmentRouteInfoWithAccess(ctx, ['security'], [{ name: 'events', roles: ['security'] }], shipment_id)
}

/**
 * Helper untuk menyetel `route_path` dan `current_leg_index` secara type-safe.
 * Digunakan oleh seed agar konsisten dengan cara layanan membaca/menulis data.
 */
// Setter terpusat route_path + current_leg_index (type-safe), melempar 404 bila shipment tidak ada
export async function setShipmentRoutePathAndLeg(
  shipment_id: string,
  route_path: string[],
  current_leg_index: number
): Promise<{ route_path: string[]; current_leg_index: number }> {
  const sh = await prisma.shipment.findFirst({ where: { shipmentId: shipment_id }, select: { id: true } })
  if (!sh) throw new AppError(404, 'Shipment not found')
  const rp = normalizeRoutePath(route_path)
  const idx = clampLegIndex(rp, current_leg_index)
  await prisma.$executeRaw`UPDATE shipments SET route_path = ${JSON.stringify(rp)}, current_leg_index = ${idx} WHERE shipment_id = ${shipment_id}`
  return { route_path: rp, current_leg_index: idx }
}
async function getShipmentRouteInfoWithAccess(
  ctx: UserContext,
  roles: AppRole[],
  sectionsAny: Array<{ name: PermissionSection; roles: AppRole[] }>,
  shipment_id: string
): Promise<{ route_path: string[]; current_leg_index: number } | null> {
  assertAccessAny(ctx, roles, sectionsAny)
  return getClampedRouteInternal(shipment_id)
}

export async function resolveShipmentId(codeOrUuid?: string): Promise<string | null> {
  return resolveEntityIdByCodeOrUuid('shipment', codeOrUuid, 'shipmentId')
}

export async function resolveWarehouseId(codeOrUuid?: string): Promise<string | null> {
  return resolveEntityIdByCodeOrUuid('warehouse', codeOrUuid, 'code')
}

async function resolveEntityIdByCodeOrUuid(table: 'shipment' | 'warehouse', codeOrUuid?: string, codeField: 'shipmentId' | 'code' = 'shipmentId'): Promise<string | null> {
  if (!codeOrUuid) return null
  const looksUuid = codeOrUuid.length === 36 && codeOrUuid.includes('-')
  if (looksUuid) return codeOrUuid
  try {
    if (table === 'shipment') {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM shipments WHERE shipment_id = ${codeOrUuid} LIMIT 1`
      return rows[0]?.id ?? null
    } else {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM warehouse WHERE code = ${codeOrUuid} LIMIT 1`
      return rows[0]?.id ?? null
    }
  } catch {}
  return null
}

export async function isShipmentAssignedToDriver(ctx: UserContext, shipment_id: string): Promise<boolean> {
  if (!ctx?.id || !ctx?.email) return false
  // Resolve internal shipment id
  let internalId: string | null = null
  try {
    internalId = await resolveShipmentId(shipment_id)
  } catch {}
  if (!internalId) return false

  // 1) Cek dokumen route_schedule → driverProfile.supabaseUserId
  try {
    const doc = await (prisma as any).document.findFirst({ where: { shipmentId: internalId, docType: 'route_schedule' }, select: { refCode: true } })
    const schedId = doc?.refCode || null
    if (schedId) {
      const sched = await (prisma as any).routeSchedule.findUnique({ where: { id: schedId }, select: { driverProfileId: true } })
      if (sched?.driverProfileId) {
        const drv = await prisma.driverProfile.findUnique({ where: { id: sched.driverProfileId }, select: { supabaseUserId: true } })
        if (drv?.supabaseUserId && drv.supabaseUserId === ctx.id) return true
      }
    }
  } catch {}

  // 2) tracking_ping oleh driver untuk shipment yang sama
  try {
    const cntRows = await prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*) AS c FROM tracking_ping WHERE user_id = ${ctx.id} AND shipment_id = ${internalId} LIMIT 1`
    if (Number(cntRows[0]?.c || 0) > 0) return true
  } catch {}

  // 3) scan_event oleh email driver untuk shipment yang sama
  try {
    const cntScan = await prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*) AS c FROM scan_event WHERE user_email = ${ctx.email} AND shipment_id = ${internalId} LIMIT 1`
    if (Number(cntScan[0]?.c || 0) > 0) return true
  } catch {}

  return false
}

export async function getDriverTasks(ctx: UserContext, options?: { onlyActive?: boolean; limit?: number }): Promise<DriverTaskRecord[]> {
  assertAccessAny(ctx, ['driver'], [{ name: 'shipments', roles: ['driver'] }])
  const orgId = ctx.orgId
  const results: Array<{ shipment_id: string; customer: string; origin: string; destination: string; status: string; warehouse_id: string; proof: DriverTaskProof }> = []
  const scheduleRows = await prisma.$queryRaw<Array<{ shipment_id: string; customer: string; origin: string; destination: string; status: string; warehouse_id: string }>>`
    SELECT s.shipment_id, s.customer, s.origin, s.destination, s.status, s.warehouse_id
    FROM document d
    JOIN shipments s ON s.id = d.shipment_id
    JOIN route_schedule rs ON rs.id = d.ref_code
    JOIN driver_profile dp ON dp.id = rs.driver_profile_id
    WHERE d.doc_type = 'route_schedule'
      AND d.organization_id = ${orgId}
      AND dp.supabase_user_id = ${ctx.id}
  `
  for (const r of scheduleRows) results.push({ ...r, proof: 'schedule' })
  const trackingRows = await prisma.$queryRaw<Array<{ shipment_id: string; customer: string; origin: string; destination: string; status: string; warehouse_id: string }>>`
    SELECT s.shipment_id, s.customer, s.origin, s.destination, s.status, s.warehouse_id
    FROM tracking_ping tp
    JOIN shipments s ON s.id = tp.shipment_id
    WHERE tp.user_id = ${ctx.id}
      AND s.organization_id = ${orgId}
  `
  for (const r of trackingRows) results.push({ ...r, proof: 'tracking' })
  const scanRows = await prisma.$queryRaw<Array<{ shipment_id: string; customer: string; origin: string; destination: string; status: string; warehouse_id: string }>>`
    SELECT s.shipment_id, s.customer, s.origin, s.destination, s.status, s.warehouse_id
    FROM scan_event se
    JOIN shipments s ON s.id = se.shipment_id
    WHERE se.user_email = ${ctx.email}
      AND s.organization_id = ${orgId}
  `
  for (const r of scanRows) results.push({ ...r, proof: 'scan' })

  const rank: Record<DriverTaskProof, number> = { schedule: 3, tracking: 2, scan: 1 }
  const byShip = new Map<string, { shipment_id: string; customer: string; origin: string; destination: string; status: string; warehouse_id: string; proof: DriverTaskProof }>()
  for (const r of results) {
    const cur = byShip.get(r.shipment_id)
    if (!cur || rank[r.proof] > rank[cur.proof]) byShip.set(r.shipment_id, r)
  }
  let list = Array.from(byShip.values())
  if (Array.isArray(ctx.warehouseIds) && ctx.warehouseIds.length > 0) {
    const set = new Set(ctx.warehouseIds)
    list = list.filter(x => set.has(x.warehouse_id))
  }
  if (options?.onlyActive) list = list.filter(x => x.status !== 'delivered')
  const mapped: DriverTaskRecord[] = list.map(x => ({ shipment_id: x.shipment_id, customer: x.customer, origin: x.origin, destination: x.destination, status: x.status, proof: x.proof }))
  if (typeof options?.limit === 'number' && options!.limit! > 0) return mapped.slice(0, options!.limit!)
  return mapped
}
