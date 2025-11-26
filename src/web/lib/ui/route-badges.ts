import { deriveStopStatusForWarehouse } from '@/lib/services/route-service'

export function computeStopBadges(routePath: string[], activeIndex: number) {
  const rp = Array.isArray(routePath) ? routePath : []
  const idx = typeof activeIndex === 'number' ? activeIndex : 0
  return rp.map((w) => ({ warehouseId: w, status: deriveStopStatusForWarehouse(w, rp, idx) }))
}
