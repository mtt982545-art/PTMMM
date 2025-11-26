import { prisma } from '@/lib/prisma'
import type { UserContext } from '@/lib/types'

export type WarehouseInventoryItem = { warehouseId: string; productCode: string; qty: number }

export async function getInventoryProductsForWarehouses(ctx: UserContext, warehouseIds: string[]): Promise<Record<string, Array<{ code: string; qty: number }>>> {
  if (!ctx.orgId || !Array.isArray(warehouseIds) || warehouseIds.length === 0) return {}
  let rows: Array<{ warehouseId: string; productId: string; closingQty: any; dataDate: Date }> = []
  try {
    rows = await (prisma as any).inventoryKpiDaily.findMany({
      where: { orgId: ctx.orgId, warehouseId: { in: warehouseIds } },
      orderBy: { dataDate: 'desc' },
    })
  } catch {}
  const latestByKey = new Map<string, { wh: string; code: string; qty: number; at: number }>()
  for (const r of rows) {
    const key = `${r.warehouseId}|${r.productId}`
    const qty = typeof r.closingQty === 'number' ? r.closingQty : Number(r.closingQty || 0)
    const at = new Date(r.dataDate as any).getTime()
    const cur = latestByKey.get(key)
    if (!cur || at >= cur.at) {
      latestByKey.set(key, { wh: r.warehouseId, code: r.productId, qty: qty, at })
    }
  }
  const grouped: Record<string, Array<{ code: string; qty: number }>> = {}
  for (const v of latestByKey.values()) {
    if (!grouped[v.wh]) grouped[v.wh] = []
    grouped[v.wh].push({ code: v.code, qty: v.qty })
  }
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => a.code.localeCompare(b.code))
  }
  return grouped
}
