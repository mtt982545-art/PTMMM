import React from 'react'
import { computeStopBadges } from '@/lib/ui/route-badges'
import StatusBadge from '@/components/ui/status-badge'

interface ShipmentRouteBadgesPanelProps { title: string; routePath: string[]; activeIndex: number; keyPrefix?: string }
function ShipmentRouteBadgesPanel({ title, routePath, activeIndex, keyPrefix = '' }: ShipmentRouteBadgesPanelProps) {
  const badges = computeStopBadges(Array.isArray(routePath) ? routePath : [], typeof activeIndex === 'number' ? activeIndex : 0)
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-2" style={{ color: '#FFD700' }}>{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {badges.map((b) => (
          <div key={`${keyPrefix}-${b.warehouseId}`} className={`rounded border p-3 ${b.status==='active'?'border-yellow-500/50':'border-yellow-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="font-medium" style={{ color: '#fff' }}>{b.warehouseId}</div>
              <StatusBadge status={b.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
export default React.memo(ShipmentRouteBadgesPanel)
