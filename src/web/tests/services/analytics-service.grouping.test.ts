import { describe, it, expect } from 'vitest'
import { groupByWeek, groupByMonth } from '@/lib/services/analytics-service'

const daily = [
  { day: '2025-01-01', gate_in: 2, gate_out: 1, load_start: 1, load_finish: 0, scans: 3 },
  { day: '2025-01-02', gate_in: 1, gate_out: 2, load_start: 0, load_finish: 1, scans: 3 },
  { day: '2025-01-08', gate_in: 1, gate_out: 1, load_start: 1, load_finish: 1, scans: 4 },
  { day: '2025-02-01', gate_in: 3, gate_out: 2, load_start: 2, load_finish: 2, scans: 9 },
]

describe('analytics-service grouping helpers', () => {
  it('groupByWeek aggregates into weekly buckets', () => {
    const weeks = groupByWeek(daily)
    expect(Array.isArray(weeks)).toBe(true)
    const w1 = weeks.find(w => w.weekStart === '2024-12-30')
    expect(w1).toBeTruthy()
    expect(w1?.gate_in).toBe(3)
    expect(w1?.scans).toBe(6)
  })

  it('groupByMonth aggregates into monthly buckets', () => {
    const months = groupByMonth(daily)
    expect(Array.isArray(months)).toBe(true)
    const jan = months.find(m => m.month === '2025-01')
    const feb = months.find(m => m.month === '2025-02')
    expect(jan?.gate_in).toBe(4)
    expect(jan?.scans).toBe(10)
    expect(feb?.gate_in).toBe(3)
    expect(feb?.scans).toBe(9)
  })
})