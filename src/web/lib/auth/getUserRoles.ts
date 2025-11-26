import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppRole } from '../types'
import { parseRole } from '../types'

export interface UserOrgRoleRow { org_id: string; role: AppRole }

export async function getUserRoles(supabase: SupabaseClient, email: string): Promise<UserOrgRoleRow[]> {
  try {
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes?.user?.id || null
    if (uid) {
      const { data, error } = await supabase
        .from('user_org_role')
        .select('org_id, role')
        .eq('user_id', uid)
      if (!error && Array.isArray(data)) {
        return data.map((r: any) => ({ org_id: r.org_id, role: parseRole(r.role)! })).filter((r) => !!r.role)
      }
    }
  } catch {}
  const { data, error } = await supabase
    .from('user_org_role')
    .select('org_id, role')
    .eq('user_email', email)
  if (error) return []
  return (data || []).map((r: any) => ({ org_id: r.org_id, role: parseRole(r.role)! })).filter((r) => !!r.role)
}

