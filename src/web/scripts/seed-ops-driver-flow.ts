import { prisma } from '@/lib/prisma'
import type { UserContext } from '@/lib/types'
import { createShipmentWithAccess, resolveShipmentId, setShipmentRoutePathAndLeg } from '@/lib/services/shipments-service'
import { createScanEvent } from '@/lib/services/scan-service'

async function upsertOrganization(code: string, name: string) {
  const found = await (prisma as any).organization.findFirst({ where: { code }, select: { id: true } })
  if (found?.id) return found
  const created = await (prisma as any).organization.upsert({ where: { code }, update: {}, create: { code, name } })
  return created
}

async function upsertWarehouse(orgId: string, code: string, name: string) {
  const found = await (prisma as any).warehouse.findFirst({ where: { organizationId: orgId, code }, select: { id: true } })
  if (found?.id) return found
  const created = await (prisma as any).warehouse.upsert({ where: { uq_wh_org_code: { organizationId: orgId, code } }, update: {}, create: { organizationId: orgId, code, name } })
  return created
}

async function getSupabaseUserIdByEmail(email: string) {
  const rows: any[] = await (prisma as any).$queryRaw`SELECT user_id FROM user_org_role WHERE user_email = ${email} LIMIT 1`
  const uid = rows?.[0]?.user_id || null
  return uid
}

async function ensureUserOrgRole(email: string, orgCode: string, role: string) {
  try {
    await (prisma as any).$executeRaw`INSERT INTO user_org_role (user_email, org_id, role) VALUES (${email}, ${orgCode}, ${role}) ON DUPLICATE KEY UPDATE org_id = VALUES(org_id), role = VALUES(role)`
  } catch {}
}

async function ensureWarehouseMember(email: string, whCode: string) {
  try {
    await (prisma as any).$executeRaw`INSERT INTO warehouse_member (user_email, warehouse_id) VALUES (${email}, ${whCode}) ON DUPLICATE KEY UPDATE warehouse_id = VALUES(warehouse_id)`
  } catch {}
}

async function ensureDriverProfile(uid: string, orgId: string) {
  const found = await (prisma as any).driverProfile.findFirst({ where: { supabaseUserId: uid }, select: { id: true } })
  if (found?.id) return found
  const created = await (prisma as any).driverProfile.create({ data: { supabaseUserId: uid, organizationId: orgId, name: 'Driver Demo' } })
  return created
}

async function ensureRouteSchedule(driverProfileId: string, warehouseId: string) {
  const rsId = 'RS-FLOW-1'
  const existing: any[] = await (prisma as any).$queryRaw`SELECT id FROM route_schedule WHERE id = ${rsId} LIMIT 1`
  if (existing?.[0]?.id) return { id: rsId }
  await (prisma as any).$executeRaw`INSERT INTO route_schedule (id, driver_profile_id, warehouse_id, status) VALUES (${rsId}, ${driverProfileId}, ${warehouseId}, 'planned')`
  return { id: rsId }
}

async function ensureDocumentRouteSchedule(orgId: string, shipmentInternalId: string, routeScheduleId: string) {
  const exists: any[] = await (prisma as any).$queryRaw`SELECT id FROM document WHERE doc_type = 'route_schedule' AND shipment_id = ${shipmentInternalId} AND ref_code = ${routeScheduleId} LIMIT 1`
  if (exists?.[0]?.id) return { id: exists[0].id }
  await (prisma as any).$executeRaw`INSERT INTO document (doc_type, shipment_id, organization_id, ref_code) VALUES ('route_schedule', ${shipmentInternalId}, ${orgId}, ${routeScheduleId})`
  const rows: any[] = await (prisma as any).$queryRaw`SELECT id FROM document WHERE doc_type = 'route_schedule' AND shipment_id = ${shipmentInternalId} AND ref_code = ${routeScheduleId} LIMIT 1`
  return { id: rows?.[0]?.id }
}

async function ensureShipmentItems(shipmentInternalId: string, orgId: string, whId: string) {
  await (prisma as any).shipmentItem.createMany({ data: [
    { shipmentId: shipmentInternalId, organizationId: orgId, warehouseId: whId, productCode: 'PROD-X', productName: 'Produk X', uom: 'COLLY', collyCount: 10, qtyUnit: 100, weightKg: 150, volumeM3: 1.2 },
    { shipmentId: shipmentInternalId, organizationId: orgId, warehouseId: whId, productCode: 'PROD-Y', productName: 'Produk Y', uom: 'COLLY', collyCount: 5, qtyUnit: 50, weightKg: 80, volumeM3: 0.6 },
  ], skipDuplicates: true })
}

export async function seedOpsDriverFlow() {
  const orgPtmmm = await upsertOrganization('ORG-PTMMM', 'PT Mitramulia Makmur')
  const orgAvian = await upsertOrganization('ORG-AVIAN', 'PT Avian')
  const whPtmmmOri = await upsertWarehouse(orgPtmmm.id, 'WH-PTMMM-ORI', 'Gudang Origin PTMMM')
  const whAvianDest = await upsertWarehouse(orgAvian.id, 'WH-AVIAN-DEST', 'Gudang Tujuan Avian')

  await ensureUserOrgRole('marketing1@ptmmm.co', 'ORG-PTMMM', 'marketing')
  await ensureUserOrgRole('ops@ptmmm.co', 'ORG-PTMMM', 'ops')
  await ensureUserOrgRole('driver1@ptmmm.co', 'ORG-PTMMM', 'driver')
  await ensureUserOrgRole('security1@ptmmm.co', 'ORG-PTMMM', 'security')
  await ensureUserOrgRole('security.avn1@avian.co.id', 'ORG-AVIAN', 'security')
  await ensureUserOrgRole('ops.avn1@avian.co.id', 'ORG-AVIAN', 'ops')

  await ensureWarehouseMember('marketing1@ptmmm.co', 'WH-PTMMM-ORI')
  await ensureWarehouseMember('ops@ptmmm.co', 'WH-PTMMM-ORI')
  await ensureWarehouseMember('driver1@ptmmm.co', 'WH-PTMMM-ORI')
  await ensureWarehouseMember('security1@ptmmm.co', 'WH-PTMMM-ORI')
  await ensureWarehouseMember('security.avn1@avian.co.id', 'WH-AVIAN-DEST')
  await ensureWarehouseMember('ops.avn1@avian.co.id', 'WH-AVIAN-DEST')

  const drvUid = await getSupabaseUserIdByEmail('driver1@ptmmm.co')
  let driverProfileId: string | null = null
  if (drvUid) {
    const dp = await ensureDriverProfile(drvUid, orgPtmmm.id)
    driverProfileId = dp.id
  }

  const ctxMarketing: UserContext = { id: 'MKT-SEED', email: 'marketing1@ptmmm.co', role: 'marketing', orgId: orgPtmmm.id, warehouseIds: [whPtmmmOri.id], sectionsAllowed: ['shipments','kpi','orders'] }

  let shipmentInternalId: string
  try {
    const created = await createShipmentWithAccess(ctxMarketing, { shipment_id: 'SHP-FLOW-1', customer: 'PT Flow', origin: 'SBY', destination: 'JKT', status: 'in_transit' } as any)
    shipmentInternalId = created.id
  } catch {
    const resolved = await resolveShipmentId('SHP-FLOW-1')
    shipmentInternalId = resolved
  }

  await (prisma as any).$executeRaw`UPDATE shipments SET organization_id = ${orgPtmmm.id}, warehouse_id = ${whPtmmmOri.id} WHERE shipment_id = 'SHP-FLOW-1'`
  await setShipmentRoutePathAndLeg('SHP-FLOW-1', ['WH-PTMMM-ORI','WH-AVIAN-DEST'], 0)
  await ensureShipmentItems(shipmentInternalId, orgPtmmm.id, whPtmmmOri.id)

  if (driverProfileId) {
    const rs = await ensureRouteSchedule(driverProfileId, whPtmmmOri.id)
    await ensureDocumentRouteSchedule(orgPtmmm.id, shipmentInternalId, rs.id)
  }

  const baseForm = 'FORM-OPS-001'
  const idk = (t: string) => `seed:ops-driver-flow:${t}`
  const ev = async (eventType: any, warehouseId: string, userEmail: string) => {
    try {
      await createScanEvent({ formCode: baseForm, shipmentId: 'SHP-FLOW-1', warehouseId, eventType, payload: { idempotency_key: idk(`${warehouseId}:${eventType}`) }, userEmail } as any)
    } catch {}
  }
  await ev('gate_in', 'WH-PTMMM-ORI', 'security1@ptmmm.co')
  await ev('load_start', 'WH-PTMMM-ORI', 'ops@ptmmm.co')
  await ev('load_finish', 'WH-PTMMM-ORI', 'ops@ptmmm.co')
  await ev('gate_out', 'WH-PTMMM-ORI', 'security1@ptmmm.co')
  await ev('gate_in', 'WH-AVIAN-DEST', 'security.avn1@avian.co.id')
  await ev('load_start', 'WH-AVIAN-DEST', 'ops.avn1@avian.co.id')
  await ev('load_finish', 'WH-AVIAN-DEST', 'ops.avn1@avian.co.id')
  await ev('pod', 'WH-AVIAN-DEST', 'driver1@ptmmm.co')

  return { orgPtmmm: orgPtmmm.id, orgAvian: orgAvian.id, whPtmmmOri: whPtmmmOri.id, whAvianDest: whAvianDest.id, shipment: shipmentInternalId, driverProfileId }
}

async function main() {
  const res = await seedOpsDriverFlow()
  console.log(JSON.stringify({ ok: true, ...res }))
  await (prisma as any).$disconnect()
}

if (require.main === module) {
  main().catch(async (e) => {
    console.error('seed error', e?.message || e)
    await (prisma as any).$disconnect()
    process.exit(1)
  })
}
