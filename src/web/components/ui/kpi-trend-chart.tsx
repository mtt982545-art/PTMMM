import React from 'react'

type DayCounts = { day: string; gate_in?: number; gate_out?: number; load_start?: number; load_finish?: number; scans?: number }

function KpiTrendChart({ data }: { data: DayCounts[] }) {
  const days = Array.isArray(data) ? data.slice(-14) : []
  const max = Math.max(1, ...days.map((d) => (d.scans ?? 0) + (d.gate_in ?? 0) + (d.gate_out ?? 0)))
  return (
    <div className="mt-2" aria-label="KPI Trend 14 hari">
      <div className="flex items-end gap-1 h-24">
        {days.map((d) => {
          const value = (d.scans ?? 0) + (d.gate_in ?? 0) + (d.gate_out ?? 0)
          const h = Math.round((value / max) * 96)
          return (
            <div key={d.day} className="flex flex-col items-center" style={{ color: '#b0b7c3' }}>
              <div aria-label={`Hari ${d.day}, total ${value}`} style={{ height: `${h}px` }} className="w-3 bg-yellow-500/40 border border-yellow-500/60 rounded"></div>
              <div className="text-[10px] mt-1">{d.day.slice(5)}</div>
            </div>
          )
        })}
      </div>
      <div className="text-xs mt-2" style={{ color: '#b0b7c3' }}>Trend 14 hari (scans + gate_in + gate_out)</div>
    </div>
  )
}
export default React.memo(KpiTrendChart)
