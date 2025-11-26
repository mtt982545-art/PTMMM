// Clamp indeks leg agar selalu berada dalam rentang valid route_path
export function clampLegIndex(route_path: string[], idx: number): number {
  const maxIdx = route_path.length > 0 ? route_path.length - 1 : 0
  if (typeof idx !== 'number') return 0
  if (idx < 0) return 0
  if (idx > maxIdx) return maxIdx
  return idx
}
export function normalizeRoutePath(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input.filter((v) => typeof v === 'string') as string[]
}

export function isWarehouseValidForEvent(route_path: string[], current_leg_index: number, warehouseId: string, eventType: 'gate_in' | 'gate_out' | 'load_start' | 'load_finish' | 'scan' | 'pod'): boolean {
  const route = normalizeRoutePath(route_path)
  const idx = clampLegIndex(route, typeof current_leg_index === 'number' ? current_leg_index : 0)
  const currentWh = route[idx]
  if (eventType === 'scan') return true
  if (!currentWh) return false
  return warehouseId === currentWh
}
