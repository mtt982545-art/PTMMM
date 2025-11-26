import AppShell from '@/components/layout/app-shell'
import KpiCard from '@/components/ui/kpi-card'
import { getServerUserContext, canViewSection, requireRole } from '@/lib/auth/server-auth'
import { formatNumber, formatPercentage } from '@/lib/kpi-helpers'
import { redirect } from 'next/navigation'
import { getAnalyticsOverviewForUser } from '@/lib/services/analytics-service'

export const dynamic = 'force-dynamic'

export default async function OpsDashboardPage() {
  const user = await getServerUserContext()
  if (!user) redirect('/login')
  if (!requireRole(user, ['ops'])) redirect('/dashboard')
  redirect('/ops/load')

  let kpi = { gate_in: 0, gate_out: 0, load_start: 0, load_finish: 0, scans: 0, on_time_delivery: 0 }
  let events: Array<{ day: string; gate_in: number; gate_out: number; load_start: number; load_finish: number; scans: number }> = []
  try {
    const { data, kpi: k } = await getAnalyticsOverviewForUser(user)
    kpi = k
    if (canViewSection(user, 'events')) {
      events = data || []
    }
  } catch {}

  return null
}
