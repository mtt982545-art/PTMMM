import React from 'react'

function StatusBadge({ status }: { status: 'completed' | 'active' | 'pending' | string }) {
  const cls = status === 'completed'
    ? 'bg-emerald-500/20 text-emerald-300'
    : status === 'active'
      ? 'bg-yellow-500/20 text-yellow-300'
      : 'bg-gray-500/20 text-gray-300'
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded ${cls}`}>{status}</span>
  )
}
export default React.memo(StatusBadge)
