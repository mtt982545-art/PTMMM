import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSupabase } from '@/lib/supabase/server'
import type { UserContext } from '@/lib/types'

export interface AdminSummary {
  organizations: number
  activeWarehouses: number
  usersByRole: { [key: string]: number }
}

export async function getAdminSummary(ctx: UserContext): Promise<AdminSummary> {
  // Hitung organisasi yang relevan (org aktif milik user)
  const orgRows = await prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*) AS c FROM organization WHERE id = ${ctx.orgId}`
  const organizations = orgRows[0]?.c ? Number(orgRows[0].c) : 0

  // Hitung gudang aktif dalam organisasi
  const whRows = await prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*) AS c FROM warehouse WHERE organization_id = ${ctx.orgId} AND is_active = 1`
  const activeWarehouses = whRows[0]?.c ? Number(whRows[0].c) : 0

  // Hitung user per role via Supabase (tabel user_org_role) untuk org yang sama
  const supa = getServerSupabase()
  const { data } = await supa
    .from('user_org_role')
    .select('role')
    .eq('org_id', ctx.orgId)
  const usersByRole: { [key: string]: number } = {}
  const rows: any[] = Array.isArray(data) ? data : []
  // Agregasi manual per role
  rows.forEach((r: any) => {
    const role = String(r.role)
    usersByRole[role] = (usersByRole[role] || 0) + 1
  })

  return { organizations, activeWarehouses, usersByRole }
}
