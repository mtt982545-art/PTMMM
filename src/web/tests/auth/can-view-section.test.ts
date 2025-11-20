import { describe, it, expect } from 'vitest'
import { canViewSection } from '@/lib/auth/server-auth'
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

describe('server-auth.canViewSection', () => {
  // Mapping peran → izin section:
  // admin: kpi + events
  // marketing: kpi saja
  // ops: kpi + events
  // security: events saja
  // driver: tidak untuk kpi/events
  it('admin dapat melihat kpi dan events', () => {
    const u = makeUser('admin')
    expect(canViewSection(u, 'kpi')).toBe(true)
    expect(canViewSection(u, 'events')).toBe(true)
  })

  it('marketing hanya melihat kpi', () => {
    const u = makeUser('marketing')
    expect(canViewSection(u, 'kpi')).toBe(true)
    expect(canViewSection(u, 'events')).toBe(false)
  })

  it('ops melihat kpi dan events', () => {
    const u = makeUser('ops')
    expect(canViewSection(u, 'kpi')).toBe(true)
    expect(canViewSection(u, 'events')).toBe(true)
  })

  it('security hanya melihat events', () => {
    const u = makeUser('security')
    expect(canViewSection(u, 'kpi')).toBe(false)
    expect(canViewSection(u, 'events')).toBe(true)
  })

  it('driver tidak melihat kpi maupun events', () => {
    const u = makeUser('driver')
    expect(canViewSection(u, 'kpi')).toBe(false)
    expect(canViewSection(u, 'events')).toBe(false)
  })

  it('null user tidak punya akses', () => {
    expect(canViewSection(null, 'kpi')).toBe(false)
    expect(canViewSection(null, 'events')).toBe(false)
  })
})