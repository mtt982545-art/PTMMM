import { prisma } from '@/lib/prisma'

export async function maybeAdvanceShipmentLeg(parsed: { shipmentId?: string | null; warehouseId?: string | null; eventType: string }) {
  const sid = parsed.shipmentId
  if (!sid) return
  let sh: any = null
  try {
    sh = await (prisma as any).shipment.findFirst({ where: { shipmentId: sid }, select: { routePath: true, currentLegIndex: true } })
  } catch {}
  if (!sh) return
  const rp = Array.isArray(sh.routePath) ? (sh.routePath as string[]) : []
  const length = rp.length
  const rawI = typeof sh.currentLegIndex === 'number' ? sh.currentLegIndex : 0
  const maxIdx = length > 0 ? length - 1 : 0
  const i = rawI < 0 ? 0 : rawI > maxIdx ? maxIdx : rawI
  if (i !== rawI) {
    try {
      await prisma.$executeRaw`UPDATE shipments SET current_leg_index = ${i} WHERE shipment_id = ${sid}`
    } catch {}
  }
  if (!parsed.warehouseId) return
  if (length < 2) {
    if (i !== 0) {
      try {
        await prisma.$executeRaw`UPDATE shipments SET current_leg_index = 0 WHERE shipment_id = ${sid}`
      } catch {}
    }
    return
  }
  if (parsed.eventType !== 'gate_in') return
  if (i >= maxIdx) return
  const nextWh = rp[i + 1]
  if (nextWh === parsed.warehouseId) {
    const next = i + 1
    try {
      await prisma.$executeRaw`UPDATE shipments SET current_leg_index = ${next} WHERE shipment_id = ${sid}`
    } catch {}
  }
}

export async function listWarehousesForOrganization(orgId: string): Promise<Array<{ id: string; organizationId: string; code: string; name: string; isActive: boolean; createdAt: Date }>> {
  const rows = await prisma.$queryRaw<Array<{ id: string; organization_id: string; code: string; name: string; is_active: number; created_at: Date }>>`
    SELECT id, organization_id, code, name, is_active, created_at
    FROM warehouse
    WHERE organization_id = ${orgId}
    ORDER BY created_at DESC
  `
  return rows.map((r) => ({ id: r.id, organizationId: r.organization_id, code: r.code, name: r.name, isActive: !!r.is_active, createdAt: r.created_at }))
}

export async function createWarehouseForOrganization(orgId: string, code: string, name: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO warehouse (id, organization_id, code, name, is_active)
    VALUES (UUID(), ${orgId}, ${code}, ${name}, 1)
  `
}

export async function updateWarehouseName(id: string, name: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE warehouse SET name = ${name}
    WHERE id = ${id}
  `
}

export async function setWarehouseActive(id: string, isActive: boolean): Promise<void> {
  await prisma.$executeRaw`
    UPDATE warehouse SET is_active = ${isActive ? 1 : 0}
    WHERE id = ${id}
  `
}
