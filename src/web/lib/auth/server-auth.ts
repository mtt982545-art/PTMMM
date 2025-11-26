import { getServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers';
import type { AppRole, UserContext, PermissionSection } from '@/lib/types';

export async function getServerUserContext(): Promise<UserContext | null> {
  const ck = cookies()
  const demo = ck.get('demo_session')
  if (demo?.value === '1') {
    const sectionsAllowed: PermissionSection[] = ['orders','shipments','events','reports','kpi']
    return { id: 'DEMO', email: 'demo@example.com', role: 'admin', warehouseIds: [], orgId: 'DEMO', sectionsAllowed }
  }
  const supa = getServerSupabase()
  const { data } = await supa.auth.getUser()
  const user = data.user
  if (!user?.email) return null
  const { data: roleRow } = await supa
    .from('user_org_role')
    .select('org_id, role')
    .eq('user_email', user.email)
    .single()
  if (!roleRow) return null
  const activeRoleCk = ck.get('active_role')?.value || null
  const activeOrgCk = ck.get('active_org_id')?.value || null
  let role = roleRow.role as AppRole
  if (activeRoleCk) role = activeRoleCk as AppRole
  const { data: whRows } = await supa
    .from('warehouse_member')
    .select('warehouse_id')
    .eq('user_email', user.email)
  let warehouseIds = whRows?.map((r) => r.warehouse_id) || []
  if (!warehouseIds.length) {
    const { data: officeRows } = await supa
      .from('office_member')
      .select('office_id')
      .eq('user_id', user.id)
    const officeIds = officeRows?.map((r: any) => r.office_id) || []
    if (officeIds.length) {
      const ids = officeIds
      const { data: mapRows } = await supa
        .from('office_warehouse_map')
        .select('warehouse_id')
        .in('office_id', ids)
      warehouseIds = mapRows?.map((m: any) => m.warehouse_id) || []
    }
  }
  const isUuid = (s: string) => typeof s === 'string' && s.length === 36 && /-/.test(s)
  let orgId = (activeOrgCk || roleRow.org_id) as string
  if (!isUuid(orgId)) {
    try {
      const o = await prisma.organization.findFirst({ where: { code: orgId }, select: { id: true } })
      if (o?.id) orgId = o.id
    } catch {}
  }
  const mappedWhIds: string[] = []
  for (const wid of warehouseIds) {
    if (isUuid(wid)) {
      mappedWhIds.push(wid)
    } else {
      try {
        const w = await prisma.warehouse.findFirst({ where: { code: wid }, select: { id: true } })
        mappedWhIds.push(w?.id || wid)
      } catch {
        mappedWhIds.push(wid)
      }
    }
  }
  // Filter warehouseIds berdasarkan org aktif jika memungkinkan
  try {
    const orgWhs = await prisma.warehouse.findMany({ where: { organizationId: orgId }, select: { id: true } })
    const orgWhIds = new Set((orgWhs || []).map((w) => w.id))
    if (orgWhIds.size > 0) {
      warehouseIds = mappedWhIds.filter((id) => orgWhIds.has(id))
    } else {
      warehouseIds = mappedWhIds
    }
  } catch {
    warehouseIds = mappedWhIds
  }
  const perms: Record<AppRole, PermissionSection[]> = {
    admin: ['orders','shipments','events','reports','kpi'],
    marketing: ['orders','shipments','kpi'],
    ops: ['shipments','events','kpi'],
    security: ['events'],
    driver: ['shipments'],
  }
  const sectionsAllowed = perms[role] || []
  return { id: user.id!, email: user.email, role, warehouseIds, orgId, sectionsAllowed }
}

export function canViewSection(user: UserContext | null, section: PermissionSection): boolean {
  if (!user) return false;
  return Array.isArray(user.sectionsAllowed) && user.sectionsAllowed.includes(section);
}

export function requireRole(user: UserContext | null, roles: AppRole[]): boolean {
  return !!user && roles.includes(user.role);
}

export function ensureSectionAccess(user: UserContext | null, section: PermissionSection, roles: AppRole[]): boolean {
  if (!user) return false
  if (!roles.includes(user.role)) return false
  return Array.isArray(user.sectionsAllowed) && user.sectionsAllowed.includes(section)
}

export function isInOrgWarehouseScope(ctx: UserContext | null, orgId?: string, warehouseId?: string): boolean {
  if (!ctx || !orgId) return false
  const inOrg = ctx.orgId === orgId
  const inWh = warehouseId ? ((Array.isArray(ctx.warehouseIds) && ctx.warehouseIds.length ? ctx.warehouseIds.includes(warehouseId) : true)) : true
  return inOrg && inWh
}
