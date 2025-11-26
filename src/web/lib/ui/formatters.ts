export function formatRoutePath(path?: string[]) {
  return Array.isArray(path) && path.length ? path.join(' → ') : '—'
}

export function formatLegIndex(idx?: number) {
  return typeof idx === 'number' ? `Leg #${idx}` : 'Leg #0'
}

export function formatTokenHint(kind: 'route' | 'ship' | 'token') {
  if (kind === 'route') return 'Route Code (mis. RT-001)'
  if (kind === 'ship') return 'Ship Code (mis. SHP-001)'
  return 'Token (mis. FORM-OPS-001)'
}
