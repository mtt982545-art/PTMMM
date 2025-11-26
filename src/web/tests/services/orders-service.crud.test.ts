import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  return { prisma: { $executeRaw: vi.fn(), $queryRaw: vi.fn() } }
})

import { prisma } from '@/lib/prisma'
import { createOrder, getOrderByCode, updateOrder, deleteOrder } from '@/lib/services/orders-service'

describe('orders-service CRUD', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('createOrder inserts and returns id', async () => {
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    ;(prisma.$queryRaw as any).mockResolvedValue([{ id: 'ORD-1' }])
    const res = await createOrder({ order_code: 'ORD-1', customer: 'PT AAA', origin: 'SBY', destination: 'JKT', status: 'new' })
    expect(res.id).toBe('ORD-1')
  })

  it('getOrderByCode returns record', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ id: 'ORD-1', order_code: 'ORD-1', customer: 'PT AAA', origin: 'SBY', destination: 'JKT', status: 'new' }])
    const rec = await getOrderByCode('ORD-1')
    expect(rec?.customer).toBe('PT AAA')
  })

  it('updateOrder patches fields and returns updated record', async () => {
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    ;(prisma.$queryRaw as any).mockResolvedValue([{ id: 'ORD-1', order_code: 'ORD-1', customer: 'PT BBB', origin: 'SBY', destination: 'BDO', status: 'processing' }])
    const rec = await updateOrder('ORD-1', { customer: 'PT BBB', destination: 'BDO', status: 'processing' })
    expect(rec?.destination).toBe('BDO')
    expect(rec?.status).toBe('processing')
  })

  it('deleteOrder returns true when row affected', async () => {
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    const ok = await deleteOrder('ORD-1')
    expect(ok).toBe(true)
  })
})