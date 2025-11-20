import { getServerSupabase } from '@/lib/supabase/server';
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
  const role = roleRow.role as AppRole
  const { data: whRows } = await supa
    .from('warehouse_member')
    .select('warehouse_id')
    .eq('user_email', user.email)
  const warehouseIds = whRows?.map((r) => r.warehouse_id) || []
  const perms: Record<AppRole, PermissionSection[]> = {
    admin: ['orders','shipments','events','reports','kpi'],
    marketing: ['orders','kpi'],
    ops: ['shipments','events','kpi'],
    security: ['events'],
    driver: ['shipments'],
  }
  const sectionsAllowed = perms[role] || []
  return { id: user.id!, email: user.email, role, warehouseIds, orgId: roleRow.org_id, sectionsAllowed }
}

export function canViewSection(user: UserContext | null, section: PermissionSection): boolean {
  if (!user) return false;
  return Array.isArray(user.sectionsAllowed) && user.sectionsAllowed.includes(section);
}

export function requireRole(user: UserContext | null, roles: AppRole[]): boolean {
  return !!user && roles.includes(user.role);
}