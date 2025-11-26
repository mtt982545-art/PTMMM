import { describe, it, expect } from 'vitest'
import { requireRole, canViewSection } from '@/lib/auth/server-auth'
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

describe('role guards for dashboards', () => {
  it('ops dashboard hanya untuk ops', () => {
    const uOps = makeUser('ops')
    const uMarketing = makeUser('marketing')
    expect(requireRole(uOps, ['ops'])).toBe(true)
    expect(requireRole(uMarketing, ['ops'])).toBe(false)
  })

  it('security gate hanya untuk security', () => {
    const uSec = makeUser('security')
    const uOps = makeUser('ops')
    expect(requireRole(uSec, ['security'])).toBe(true)
    expect(requireRole(uOps, ['security'])).toBe(false)
    expect(canViewSection(uSec, 'events')).toBe(true)
  })

  it('driver home hanya untuk driver', () => {
    const uDriver = makeUser('driver')
    const uAdmin = makeUser('admin')
    expect(requireRole(uDriver, ['driver'])).toBe(true)
    expect(requireRole(uAdmin, ['driver'])).toBe(false)
    expect(canViewSection(uDriver, 'shipments')).toBe(true)
  })
})
