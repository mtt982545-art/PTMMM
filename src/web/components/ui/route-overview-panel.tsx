import React from 'react'
import { formatRoutePath, formatLegIndex } from '@/lib/ui/formatters'
import StatusBadge from '@/components/ui/status-badge'

type Stop = { id: string; warehouse_id: string; status: string }
type Details = { code?: string; route_path?: string[]; active_leg_index?: number; stops?: Stop[] }

interface RouteOverviewPanelProps { title: string; details?: Details }
function RouteOverviewPanel({ title, details }: RouteOverviewPanelProps) {
  if (!details) return null
  const route_path = Array.isArray(details.route_path) ? details.route_path : []
  const active_leg_index = typeof details.active_leg_index === 'number' ? details.active_leg_index : 0
  const stops = Array.isArray(details.stops) ? details.stops : []
  return (
    <div className="mt-6 rounded-xl border border-yellow-500/30 bg-white/5 p-6">
      <h3 className="text-lg font-semibold mb-3" style={{ color: '#FFD700' }}>{title}</h3>
      <div className="text-sm" style={{ color: '#b0b7c3' }}>
        {details.code ? (
          <div><span className="font-medium" style={{ color: '#fff' }}>Route Code:</span> {details.code}</div>
        ) : null}
        <div><span className="font-medium" style={{ color: '#fff' }}>Route Path:</span> {formatRoutePath(route_path)}</div>
        <div><span className="font-medium" style={{ color: '#fff' }}>Active Leg:</span> {formatLegIndex(active_leg_index)}</div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {stops.map((s) => (
          <div key={s.id} className="rounded border border-yellow-500/20 p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium" style={{ color: '#fff' }}>{s.warehouse_id}</div>
                <StatusBadge status={s.status} />
              </div>
          </div>
        ))}
      </div>
    </div>
  )
}
export default React.memo(RouteOverviewPanel)
