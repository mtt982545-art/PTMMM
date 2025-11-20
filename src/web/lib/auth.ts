/**
 * Role-based authentication utilities for PTMMM WMS
 *
 * DEPRECATED: gunakan util di `lib/auth/server-auth.ts` untuk server-side RBAC
 * - File ini dipertahankan sementara untuk kompatibilitas legacy pada client-side
 * - Jangan gunakan `canViewSection` dari sini di server component / API
 */

export type UserRole = 'admin' | 'marketing' | 'ops' | 'security' | 'driver';

export interface UserContext {
  email: string;
  role: UserRole;
  warehouseIds: string[];
  orgId?: string;
}

/**
 * Get current user role from Supabase session
 * This is a simplified version - in production you'd fetch from user_org_role table
 */
export async function getUserRole(supabase: any): Promise<UserContext | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;

    // Fetch user role from user_org_role table
    const { data: roleData } = await supabase
      .from('user_org_role')
      .select('user_email, org_id, role')
      .eq('user_email', user.email)
      .single();

    if (!roleData) return null;

    // Fetch warehouse access from warehouse_member table
    const { data: warehouseData } = await supabase
      .from('warehouse_member')
      .select('warehouse_id')
      .eq('user_email', user.email);

    const warehouseIds = warehouseData?.map(w => w.warehouse_id) || [];

    return {
      email: user.email,
      role: roleData.role as UserRole,
      warehouseIds,
      orgId: roleData.org_id
    };
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Check if user has access to specific warehouse
 */
export function hasWarehouseAccess(user: UserContext | null, warehouseId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.warehouseIds.includes(warehouseId);
}

/**
 * Role-based feature access
 */
/**
 * DEPRECATED: gunakan `canViewSection` dari `lib/auth/server-auth.ts`
 */
export function canViewSection(user: UserContext | null, section: string): boolean {
  if (!user) return false;
  
  const rolePermissions = {
    admin: ['orders', 'shipments', 'events', 'reports', 'kpi'],
    marketing: ['orders', 'kpi'],
    ops: ['shipments', 'events', 'kpi'],
    security: ['events'],
    driver: ['shipments']
  };

  return rolePermissions[user.role]?.includes(section) || false;
}

/**
 * Filter events by role-specific event types
 */
export function filterEventsByRole(events: any[], user: UserContext | null): any[] {
  if (!user) return [];
  
  const roleEventTypes = {
    security: ['gate_in', 'gate_out'],
    ops: ['load_start', 'load_finish', 'scan', 'pod'],
    driver: ['scan', 'pod'],
    marketing: [], // sees all events
    admin: [] // sees all events
  };

  const allowedTypes = roleEventTypes[user.role];
  if (allowedTypes.length === 0) return events; // no filtering
  
  return events.filter(event => allowedTypes.includes(event.event_type));
}