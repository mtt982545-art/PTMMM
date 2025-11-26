/**
 * Client-side authentication helpers
 * For use in client components only
 * 
 * Testing Scenarios:
 * 1. extractRoleFromEmail('admin1@ptmmm.co') → returns 'admin'
 * 2. extractRoleFromEmail('marketing1@ptmmm.co') → returns 'marketing'
 * 3. extractRoleFromEmail('ops1@ptmmm.co') → returns 'ops'
 * 4. extractRoleFromEmail('security1@ptmmm.co') → returns 'security'
 * 5. extractRoleFromEmail('driver1@ptmmm.co') → returns 'driver'
 * 6. extractRoleFromEmail('user@example.com') → returns null
 * 7. extractRoleFromEmail('') → returns null
 * 8. extractRoleFromEmail(null) → returns null
 * 9. getClientRoleRedirect('admin', '/dashboard') → returns '/admin'
 * 10. getClientRoleRedirect('marketing', '/dashboard') → returns '/marketing/dashboard'
 * 11. getClientRoleRedirect('ops', '/dashboard') → returns '/ops/dashboard'
 * 12. getClientRoleRedirect('security', '/dashboard') → returns '/security/gate'
 * 13. getClientRoleRedirect('driver', '/dashboard') → returns '/driver/home'
 * 14. getClientRoleRedirect(null, '/dashboard') → returns '/dashboard' (fallback)
 * 15. getClientRoleRedirect('unknown', '/custom') → returns '/custom' (fallback)
 */

import type { AppRole } from '../types';
import { getDashboardPathForRole } from '../types';

/**
 * Role-based redirect destinations
 * Client-safe version using centralized ROLE_DESTINATIONS
 */
export const CLIENT_ROLE_DESTINATIONS = {
  admin: getDashboardPathForRole('admin'),
  marketing: getDashboardPathForRole('marketing'),
  ops: getDashboardPathForRole('ops'),
  security: getDashboardPathForRole('security'),
  driver: getDashboardPathForRole('driver'),
} as const;

/**
 * Get role-based redirect destination (client-safe)
 */
export function getClientRoleRedirect(role: AppRole | null, fallback: string = '/dashboard'): string {
  if (!role) return fallback;
  return getDashboardPathForRole(role) || fallback;
}

/**
 * Extract role from email for demo purposes
 * In production, role should come from session/API
 */
export function extractRoleFromEmail(email: string): AppRole | null {
  if (!email) return null;
  
  const username = email.split('@')[0].replace(/\d+$/, '');
  
  const roleMap: Record<string, AppRole> = {
    'admin': 'admin',
    'marketing': 'marketing',
    'ops': 'ops',
    'security': 'security',
    'driver': 'driver',
  };
  
  return roleMap[username] || null;
}
