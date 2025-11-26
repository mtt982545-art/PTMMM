import { describe, it, expect } from 'vitest'
import { computeStopBadges } from '@/lib/ui/route-badges'

describe('route badges consumption by UI helpers', () => {
  it('helper derives statuses from route_path and active index', () => {
    const rp = ['WH-A','WH-B','WH-C']
    const idx = 1
    const res = computeStopBadges(rp, idx)
    expect(res.map(x => x.status)).toEqual(['completed','completed','active'])
  })

  it('helper derives statuses consistently', () => {
    const rp = ['X','Y']
    const idx = 0
    const res = computeStopBadges(rp, idx)
    expect(res.map(x => x.status)).toEqual(['completed','active'])
  })
})
