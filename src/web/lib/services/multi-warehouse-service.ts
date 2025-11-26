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
