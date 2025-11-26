import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { UserContext } from '@/lib/types'
import type { OrderRecord } from './orders-service'

export async function getRecentOrdersForUser(user: UserContext): Promise<OrderRecord[]> {
  const wids = user.warehouseIds || []
  if (!wids.length) {
    const rows = await prisma.$queryRaw<Array<OrderRecord>>`SELECT id, order_code, customer, origin, destination, status FROM orders WHERE organization_id = ${user.orgId} ORDER BY created_at DESC LIMIT 10`
    return rows
  }
  const ids = wids.map((w) => Prisma.sql`${w}`)
  const conds: Prisma.Sql[] = []
  if (ids.length) {
    conds.push(Prisma.sql`warehouse_id IN (${Prisma.join(ids)})`)
    conds.push(Prisma.sql`origin IN (${Prisma.join(ids)})`)
    conds.push(Prisma.sql`destination IN (${Prisma.join(ids)})`)
  }
  const whereExtra = conds.length ? Prisma.sql` AND (${Prisma.join(conds, ' OR ')})` : Prisma.sql``
  const q = Prisma.sql`SELECT id, order_code, customer, origin, destination, status FROM orders WHERE organization_id = ${user.orgId}${whereExtra} ORDER BY created_at DESC LIMIT 10`
  const rows = await prisma.$queryRaw<Array<OrderRecord>>(q)
  return rows
}
