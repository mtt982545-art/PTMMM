import React from 'react'

interface UiPanelProps { title?: string; children: React.ReactNode }
function UiPanel({ title, children }: UiPanelProps) {
  const headingId = title ? `panel-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined
  return (
    <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6" aria-labelledby={headingId}>
      {title ? (<h3 id={headingId} className="text-lg font-semibold mb-4" style={{ color: '#FFD700' }}>{title}</h3>) : null}
      {children}
    </div>
  )
}
export default React.memo(UiPanel)
