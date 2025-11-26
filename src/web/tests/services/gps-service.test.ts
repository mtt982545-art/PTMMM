import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const prisma = { trackingPing: { create: vi.fn().mockResolvedValue({ id: 'PING-1' }) } }
  return { default: prisma, prisma }
})

import { prisma } from '@/lib/prisma'
import { createGpsPing } from '@/lib/services/gps-service'

describe('gps-service.createGpsPing', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('menyimpan ping dengan orgId dan userId', async () => {
    const ctx = { id: 'UID-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] }
    const res = await createGpsPing(ctx as any, { lat: -6.2, lng: 106.8, speed: 30.2 })
    expect(res.id).toBe('PING-1')
    expect(((prisma as any).trackingPing.create as any).mock.calls[0][0].data.organizationId).toBe('ORG-1')
    expect(((prisma as any).trackingPing.create as any).mock.calls[0][0].data.userId).toBe('UID-DRV')
  })
})
