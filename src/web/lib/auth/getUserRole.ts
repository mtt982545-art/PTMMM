import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRole } from '../types';
import { parseRole } from '../types';

// RBAC lookup: Stage B (user_id) → Stage A (user_email)
export async function getUserRole(
  supabase: SupabaseClient,
  email: string
): Promise<AppRole | null> {
  // Stage B: coba berdasarkan user_id dari sesi aktif
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id || null;
    if (uid) {
      const { data, error } = await supabase
        .from('user_org_role')
        .select('role')
        .eq('user_id', uid)
        .limit(1);
      if (!error && data && data[0]?.role) {
        const r = parseRole(data[0].role);
        if (r) return r;
      }
    }
  } catch {}

  // Stage A: fallback berdasarkan email
  const { data, error } = await supabase
    .from('user_org_role')
    .select('role')
    .eq('user_email', email)
    .limit(1);
  if (error) return null;
  return data && data[0]?.role ? parseRole(data[0].role) : null;
}

