import { prisma } from '@/lib/prisma'
import { resolveShipmentId, resolveWarehouseId } from '@/lib/services/shipments-service'
import type { ScanEventType, InventoryMoveDirection } from '@/lib/types'

function startOfToday(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function resolveInventoryDirection(eventType: ScanEventType, refType?: string): InventoryMoveDirection | null {
  if (eventType === 'load_finish' || eventType === 'gate_out') return 'out'
  if (eventType === 'gate_in' || eventType === 'pod') return 'in'
  if (eventType === 'scan' && refType === 'transfer') return 'out'
  return null
}

export async function applyScanEventToInventory(input: { shipmentId?: string; warehouseId?: string; eventType: ScanEventType; refType?: string }) {
  const { shipmentId, warehouseId, eventType, refType } = input
  if (!shipmentId) return
  const internalShipId = await resolveShipmentId(shipmentId)
  const internalWhId = warehouseId ? await resolveWarehouseId(warehouseId) : null
  const sh = await prisma.shipment.findUnique({ where: { id: internalShipId }, select: { organizationId: true } })
  const orgId = sh?.organizationId
  if (!orgId) return
  const items = await prisma.shipmentItem.findMany({ where: { shipmentId: internalShipId }, select: { warehouseId: true, productCode: true, qtyUnit: true, uom: true } })
  const dataDate = startOfToday()
  const dir = resolveInventoryDirection(eventType, refType)
  if (dir === 'out') {
    if (!internalWhId) return
    for (const it of items) {
      if (it.warehouseId !== internalWhId) continue
      const qty = Number(it.qtyUnit ?? 0)
      if (qty <= 0) continue
      await prisma.$executeRaw`INSERT INTO inventory_kpi_daily (data_date, org_id, warehouse_id, product_id, opening_qty, received_qty, shipped_qty, adjustment_qty, closing_qty, etl_timestamp, batch_id)
        VALUES (${dataDate}, ${orgId}, ${internalWhId}, ${it.productCode}, 0, 0, ${qty}, 0, GREATEST(0, 0 - ${qty}), NOW(), 'LIVE')
        ON DUPLICATE KEY UPDATE shipped_qty = shipped_qty + ${qty}, closing_qty = GREATEST(0, closing_qty - ${qty}), updated_at = NOW()`
      try {
        await (prisma as any).inventoryMove.create({ data: { organizationId: orgId, warehouseId: internalWhId, shipmentId: internalShipId, productId: it.productCode, qty: qty, uom: it.uom || null, direction: 'out', eventType, createdAt: new Date() } })
      } catch {}
    }
  } else if (dir === 'in') {
    if (!internalWhId) return
    for (const it of items) {
      const qty = Number(it.qtyUnit ?? 0)
      if (qty <= 0) continue
      await prisma.$executeRaw`INSERT INTO inventory_kpi_daily (data_date, org_id, warehouse_id, product_id, opening_qty, received_qty, shipped_qty, adjustment_qty, closing_qty, etl_timestamp, batch_id)
        VALUES (${dataDate}, ${orgId}, ${internalWhId}, ${it.productCode}, 0, ${qty}, 0, 0, 0 + ${qty}, NOW(), 'LIVE')
        ON DUPLICATE KEY UPDATE received_qty = received_qty + ${qty}, closing_qty = closing_qty + ${qty}, updated_at = NOW()`
      try {
        await (prisma as any).inventoryMove.create({ data: { organizationId: orgId, warehouseId: internalWhId, shipmentId: internalShipId, productId: it.productCode, qty: qty, uom: it.uom || null, direction: 'in', eventType, createdAt: new Date() } })
      } catch {}
    }
  }
}
