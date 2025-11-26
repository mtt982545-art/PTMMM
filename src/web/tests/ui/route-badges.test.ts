import { describe, it, expect } from 'vitest'
import { computeStopBadges } from '@/lib/ui/route-badges'

describe('computeStopBadges', () => {
  it('computes statuses for multi-stop route', () => {
    const rp = ['WH-SDA','WH-NGJ','WH-SGS','WH-SRG']
    const statuses = computeStopBadges(rp, 1).map(b => b.status)
    expect(statuses).toEqual(['completed','completed','active','pending'])
  })
})
