/**
 * Centralized TypeScript types for PTMMM Digital Tracking
 * 
 * Testing Scenarios:
 * 1. AppRole type should include all 5 roles: admin, marketing, ops, security, driver
 * 2. UserContext interface should match server-auth.ts implementation
 * 3. All role constants should be centralized and consistent
 * 4. Type imports should work across all auth modules
 * 5. No duplicate type definitions should exist
 * 6. Role validation should work with parseRole function
 * 7. ROLE_DESTINATIONS should include all role paths
 * 8. Client and server role destinations should be synchronized
 * 9. Type safety should prevent invalid role assignments
 * 10. Warehouse access types should be consistent
 * 11. Section permission types should be type-safe
 * 12. Event filtering types should match role requirements
 * 13. KPI visibility matrix should be type-safe
 * 14. RPC parameter types should be consistent
 * 15. All auth utilities should use centralized types
 */

/**
 * Application roles - centralized definition
 * Used consistently across client and server auth modules
 */
export type AppRole = 'marketing' | 'ops' | 'security' | 'driver' | 'admin';

/**
 * User context structure for role-based access control
 * Matches the implementation in server-auth.ts
 */
export interface UserContext {
  id: string;
  email: string;
  role: AppRole;
  warehouseIds: string[];
  orgId?: string;
  sectionsAllowed: PermissionSection[];
}

/**
 * Role-based redirect destinations
 * Centralized for consistency between client and server
 */
export const ROLE_DESTINATIONS: Record<AppRole, string> = {
  marketing: '/dashboard/marketing',
  ops: '/ops/load',
  security: '/security/gate',
  driver: '/driver/home',
  admin: '/admin',
};

export function getDashboardPathForRole(role: AppRole | null | undefined): string {
  if (!role) return '/dashboard'
  return ROLE_DESTINATIONS[role] || '/dashboard'
}

/**
 * Role validation and parsing utility
 * Ensures type safety when parsing roles from external data
 */
export function parseRole(raw: unknown): AppRole | null {
  const v = typeof raw === 'string' ? raw.toLowerCase() : null;
  const allowed: AppRole[] = ['marketing', 'ops', 'security', 'driver', 'admin'];
  return v && (allowed as string[]).includes(v) ? (v as AppRole) : null;
}

/**
 * Section types for role-based permissions
 */
export type PermissionSection = 'orders' | 'shipments' | 'events' | 'reports' | 'kpi';

/**
 * Event types for role-based filtering
 */
export type EventType = 'gate_in' | 'gate_out' | 'load_start' | 'load_finish' | 'scan' | 'pod';

export type ScanEventType = 'gate_in' | 'gate_out' | 'load_start' | 'load_finish' | 'scan' | 'pod';

export type InventoryMoveDirection = 'in' | 'out';

/**
 * KPI types for role-based visibility
 */
export type KpiType = 'gate_in' | 'gate_out' | 'load_start' | 'load_finish' | 'scans' | 'on_time_delivery';

export interface KpiSummary {
  gate_in: number;
  gate_out: number;
  load_start: number;
  load_finish: number;
  scans: number;
  on_time_delivery: number;
}

/**
 * RPC parameter structure for analytics overview
 */
export interface RpcAnalyticsParams {
  p_start: string;
  p_end: string;
  p_driver_user_id?: string;
  p_warehouse?: string;
}
