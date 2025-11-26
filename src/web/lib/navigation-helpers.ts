/**
 * Navigation Helper Functions for PTMMM Digital Tracking
 * 
 * Testing Scenarios:
 * 1. getRoleNavigation() untuk admin → ['Admin Dashboard', 'Dashboard']
 * 2. getRoleNavigation() untuk marketing → ['Marketing Dashboard']
 * 3. getRoleNavigation() untuk ops → ['Ops Dashboard', 'Scan Event']
 * 4. getRoleNavigation() untuk security → ['Gate Monitor', 'Scan Event']
 * 5. getRoleNavigation() untuk driver → ['Dashboard Driver', 'Tracking Saya']
 * 6. getRoleNavigation() untuk no role → ['Dashboard']
 * 7. getRoleNavigation() untuk no user → ['Dashboard']
 * 8. getBaseNavigation() → ['Beranda', 'Digital Tracking']
 * 9. getRoleQuickActions() untuk admin → ['Digital Tracking', 'Hubungi Sales']
 * 10. getRoleQuickActions() untuk marketing → ['Tracking Sample', 'Digital Tracking', 'Hubungi Sales']
 * 11. getRoleQuickActions() untuk ops → ['Tracking Sample', 'Digital Tracking', 'Scan Event']
 * 12. getRoleQuickActions() untuk security → ['Tracking Sample', 'Digital Tracking', 'Scan Event']
 * 13. getRoleQuickActions() untuk driver → ['Tracking Pengiriman Saya']
 * 14. getRoleQuickActions() untuk demo → ['Tracking Sample', 'Digital Tracking']
 * 15. isActiveNavigation() → correctly identify active navigation item
 */

import type { AppRole } from './types';

export interface NavigationItem {
  name: string;
  href: string;
  icon?: string;
}

export interface QuickActionItem {
  name: string;
  href: string;
  variant: 'primary' | 'outline';
}

/**
 * Base navigation items - always available
 */
export function getBaseNavigation(): NavigationItem[] {
  return [
    { name: 'Beranda', href: '/' },
    { name: 'Digital Tracking', href: '/modul-x' },
  ];
}

/**
 * Get role-specific navigation items
 * Returns navigation items based on user role
 */
export function getRoleNavigation(role: AppRole | null, userEmail?: string): NavigationItem[] {
  if (!role) {
    // No role or demo mode - show dashboard only
    return [{ name: 'Dashboard', href: '/dashboard' }];
  }

  const roleNavigationMap: Record<AppRole, NavigationItem[]> = {
    admin: [
      { name: 'Admin Dashboard', href: '/admin' },
      { name: 'Dashboard', href: '/dashboard' }
    ],
    marketing: [
      { name: 'Marketing Dashboard', href: '/dashboard/marketing' }
    ],
    ops: [
      { name: 'Ops Dashboard', href: '/ops/load' },
      { name: 'Scan Event', href: '/scan' }
    ],
    security: [
      { name: 'Gate Monitor', href: '/security/gate' },
      { name: 'Scan Event', href: '/scan' }
    ],
    driver: [
      { name: 'Dashboard Driver', href: '/driver/home' },
      { name: 'Tracking Saya', href: `/tracking/${userEmail?.split('@')[0].toUpperCase()}-001` }
    ]
  };

  return roleNavigationMap[role] || [{ name: 'Dashboard', href: '/dashboard' }];
}

/**
 * Get role-specific quick actions for dashboard
 */
export function getRoleQuickActions(role: AppRole | null): QuickActionItem[] {
  const baseActions: QuickActionItem[] = [
    { name: 'Tracking Sample', href: '/tracking/FORM-OPS-001', variant: 'outline' as const },
    { name: 'Dokumentasi Digital Tracking', href: '/modul-x', variant: 'outline' as const }
  ];

  if (!role) {
    // Demo mode - show base actions only
    return baseActions;
  }

  const roleActions: Record<AppRole, QuickActionItem[]> = {
    admin: [
      ...baseActions,
      { name: 'Hubungi Sales', href: 'mailto:sales@ptmmm.co', variant: 'outline' as const }
    ],
    marketing: [
      ...baseActions,
      { name: 'Hubungi Sales', href: 'mailto:sales@ptmmm.co', variant: 'outline' as const }
    ],
    ops: [
      ...baseActions,
      { name: 'Scan Event', href: '/scan', variant: 'primary' as const }
    ],
    security: [
      ...baseActions,
      { name: 'Scan Event', href: '/scan', variant: 'primary' as const }
    ],
    driver: [
      { name: 'Tracking Pengiriman Saya', href: '/tracking/DEMO-TRACK-001', variant: 'outline' as const }
    ]
  };

  return roleActions[role] || baseActions;
}

/**
 * Check if navigation item is active
 */
export function isActiveNavigation(currentPath: string, itemHref: string): boolean {
  return currentPath === itemHref;
}

/**
 * Get role display name for UI
 */
export function getRoleDisplayName(role: AppRole | null): string {
  if (!role) return 'Pengunjung';
  
  const roleNames: Record<AppRole, string> = {
    admin: 'Administrator',
    marketing: 'Marketing',
    ops: 'Operasional',
    security: 'Security',
    driver: 'Driver'
  };

  return roleNames[role] || 'Pengguna';
}

/**
 * Get combined navigation (base + role-specific)
 */
export function getCombinedNavigation(role: AppRole | null, userEmail?: string): NavigationItem[] {
  const baseNav = getBaseNavigation();
  const roleNav = getRoleNavigation(role, userEmail);
  return [...baseNav, ...roleNav];
}
