import React from 'react'
import RouteOverviewPanel from '@/components/ui/route-overview-panel'
import ShipmentRouteBadgesPanel from '@/components/ui/shipment-route-badges-panel'

type Details = { code?: string; route_path?: string[]; active_leg_index?: number; stops?: Array<{ id: string; warehouse_id: string; status: string }> }

interface ShipmentRoutePanelProps { title: string; details?: Details; routePath?: string[]; activeIndex?: number; keyPrefix?: string }
function ShipmentRoutePanel({ title, details, routePath, activeIndex, keyPrefix }: ShipmentRoutePanelProps) {
  const rp = Array.isArray(routePath) ? routePath : (Array.isArray(details?.route_path) ? details!.route_path! : [])
  const idx = typeof activeIndex === 'number' ? activeIndex : (typeof details?.active_leg_index === 'number' ? (details!.active_leg_index as number) : 0)
  return (
    <>
      {details ? <RouteOverviewPanel title={title} details={details} /> : null}
      <ShipmentRouteBadgesPanel title={"Stop Status"} routePath={rp} activeIndex={idx} keyPrefix={keyPrefix || ''} />
    </>
  )
}
export default React.memo(ShipmentRoutePanel)
