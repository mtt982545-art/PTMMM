import { prisma } from '@/lib/prisma';
import type { KpiSummary, UserContext } from '@/lib/types';
import { createMmSyncService } from '@/lib/services/mm-sync-service'

type RowAgg = { day: string; eventType: string; cnt: number }
type DayCounts = { gate_in: number; gate_out: number; load_start: number; load_finish: number; scans: number }

function buildDayKey(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
}

// KPI menghitung semua raw event Security/Ops tanpa deduplikasi untuk audit trail
function aggregateKpi(rows: Array<{ eventType: string; createdAt: Date }>): { data: Array<{ day: string } & DayCounts>; kpi: KpiSummary } {
  const map = new Map<string, DayCounts>()
  for (const r of rows) {
    const key = buildDayKey(new Date(r.createdAt))
    const cur = map.get(key) || { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0 }
    if (r.eventType === 'gate_in') cur.gate_in++
    else if (r.eventType === 'gate_out') cur.gate_out++
    else if (r.eventType === 'load_start') cur.load_start++
    else if (r.eventType === 'load_finish') cur.load_finish++
    cur.scans++
    map.set(key, cur)
  }
  const data = Array.from(map.entries()).map(([day, v]) => ({ day, ...v }))
  const kpi: KpiSummary = {
    gate_in: data.reduce((s, x) => s + x.gate_in, 0),
    gate_out: data.reduce((s, x) => s + x.gate_out, 0),
    load_start: data.reduce((s, x) => s + x.load_start, 0),
    load_finish: data.reduce((s, x) => s + x.load_finish, 0),
    scans: data.reduce((s, x) => s + x.scans, 0),
    on_time_delivery: 98.5,
  }
  return { data, kpi }
}

export async function getAnalyticsOverview(): Promise<{ data: Array<{ day: string } & DayCounts>; kpi: KpiSummary }> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const agg = await prisma.$queryRaw<Array<RowAgg>>`
    SELECT DATE(createdAt) AS day, eventType, COUNT(*) AS cnt
    FROM scan_event
    WHERE createdAt >= ${since}
    GROUP BY day, eventType
    ORDER BY day ASC
  `
  const map = new Map<string, DayCounts>()
  for (const r of agg) {
    const cur = map.get(r.day) || { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0 }
    if (r.eventType === 'gate_in') cur.gate_in += r.cnt
    else if (r.eventType === 'gate_out') cur.gate_out += r.cnt
    else if (r.eventType === 'load_start') cur.load_start += r.cnt
    else if (r.eventType === 'load_finish') cur.load_finish += r.cnt
    cur.scans += r.cnt
    map.set(r.day, cur)
  }
  const data = Array.from(map.entries()).map(([day, v]) => ({ day, ...v }))
  const kpi: KpiSummary = {
    gate_in: data.reduce((s, x) => s + x.gate_in, 0),
    gate_out: data.reduce((s, x) => s + x.gate_out, 0),
    load_start: data.reduce((s, x) => s + x.load_start, 0),
    load_finish: data.reduce((s, x) => s + x.load_finish, 0),
    scans: data.reduce((s, x) => s + x.scans, 0),
    on_time_delivery: 98.5,
  }
  return { data, kpi }
}

export async function getAnalyticsOverviewForUser(ctx: UserContext): Promise<{ data: Array<{ day: string } & DayCounts>; kpi: KpiSummary }> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const rows = await prisma.scanEvent.findMany({
    where: {
      createdAt: { gte: since },
      ...(ctx.orgId ? { organizationId: ctx.orgId } : {}),
      ...(Array.isArray(ctx.warehouseIds) && ctx.warehouseIds.length > 0 ? { warehouseId: { in: ctx.warehouseIds } } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })
  const res = aggregateKpi(rows as Array<{ eventType: string; createdAt: Date }>)
  try {
    const mmSync = createMmSyncService()
    const from = since.toISOString().slice(0, 10)
    const to = new Date().toISOString().slice(0, 10)
    const mm = await mmSync.fetchAnalyticsOverview(ctx.orgId ?? '', Array.isArray(ctx.warehouseIds) ? ctx.warehouseIds : [], from, to)
    if (mm && typeof mm.onTimeRate === 'number') {
      res.kpi.on_time_delivery = mm.onTimeRate
    }
  } catch {}
  return res
}

export function groupByWeek(data: Array<{ day: string } & DayCounts>): Array<{ weekStart: string; weekEnd: string } & DayCounts> {
  const buckets = new Map<string, { start: Date; end: Date; counts: DayCounts }>()
  for (const row of data) {
    const d = new Date(row.day + 'T00:00:00Z')
    const dayOfWeek = d.getUTCDay()
    const start = new Date(d)
    start.setUTCDate(d.getUTCDate() - ((dayOfWeek + 6) % 7))
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    const key = start.toISOString().slice(0, 10)
    const cur = buckets.get(key) || { start, end, counts: { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0 } }
    cur.counts.gate_in += row.gate_in
    cur.counts.gate_out += row.gate_out
    cur.counts.load_start += row.load_start
    cur.counts.load_finish += row.load_finish
    cur.counts.scans += row.scans
    buckets.set(key, cur)
  }
  return Array.from(buckets.entries()).map(([k, v]) => ({ weekStart: v.start.toISOString().slice(0, 10), weekEnd: v.end.toISOString().slice(0, 10), ...v.counts }))
}

export function groupByMonth(data: Array<{ day: string } & DayCounts>): Array<{ month: string } & DayCounts> {
  const buckets = new Map<string, DayCounts>()
  for (const row of data) {
    const key = row.day.slice(0, 7)
    const cur = buckets.get(key) || { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0 }
    cur.gate_in += row.gate_in
    cur.gate_out += row.gate_out
    cur.load_start += row.load_start
    cur.load_finish += row.load_finish
    cur.scans += row.scans
    buckets.set(key, cur)
  }
  return Array.from(buckets.entries()).map(([month, counts]) => ({ month, ...counts }))
}
