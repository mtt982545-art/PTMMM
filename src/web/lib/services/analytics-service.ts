import { prisma } from '@/lib/prisma';
import type { KpiSummary, UserContext } from '@/lib/types';

type RowAgg = { day: string; eventType: string; cnt: number }
type DayCounts = { gate_in: number; gate_out: number; load_start: number; load_finish: number; scans: number }

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
      ...(Array.isArray(ctx.warehouseIds) && ctx.warehouseIds.length > 0 ? { warehouseId: { in: ctx.warehouseIds } } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })
  const map = new Map<string, DayCounts>()
  for (const r of rows) {
    const d = new Date(r.createdAt)
    const key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
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