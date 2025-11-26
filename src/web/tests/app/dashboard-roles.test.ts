import { describe, it, expect } from 'vitest'
import { canViewSection } from '@/lib/auth/server-auth'
import { getRoleNavigation, getRoleQuickActions } from '@/lib/navigation-helpers'
import type { UserContext, PermissionSection } from '@/lib/types'

function makeUser(role: UserContext['role']): UserContext {
  const map: Record<UserContext['role'], PermissionSection[]> = {
    admin: ['kpi','events','orders','shipments','reports'],
    marketing: ['kpi','orders'],
    ops: ['kpi','events','shipments'],
    security: ['events'],
    driver: ['shipments'],
  }
  return { id: 'UID', email: 'user@ptmmm.co', role, warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: map[role] }
}

describe('dashboard role views', () => {
  it('admin di dashboard memiliki navigasi Admin Dashboard dan akses kpi & events', () => {
    const u = makeUser('admin')
    const nav = getRoleNavigation(u.role, u.email)
    expect(nav.some((n) => n.name === 'Admin Dashboard')).toBe(true)
    expect(canViewSection(u, 'kpi')).toBe(true)
    expect(canViewSection(u, 'events')).toBe(true)
  })

  it('marketing di dashboard memiliki navigasi Marketing Dashboard dan tidak melihat kontrol admin', () => {
    const u = makeUser('marketing')
    const nav = getRoleNavigation(u.role, u.email)
    expect(nav.some((n) => n.name === 'Marketing Dashboard')).toBe(true)
    expect(nav.some((n) => n.name === 'Admin Dashboard')).toBe(false)
    expect(canViewSection(u, 'kpi')).toBe(true)
    expect(canViewSection(u, 'events')).toBe(false)
    expect(canViewSection(u, 'orders')).toBe(true)
  })

  it('user tanpa role sesuai mendapatkan fallback aman', () => {
    const nav = getRoleNavigation(null, undefined)
    expect(nav.some((n) => n.name === 'Dashboard')).toBe(true)
    expect(canViewSection(null, 'kpi')).toBe(false)
  })
})
