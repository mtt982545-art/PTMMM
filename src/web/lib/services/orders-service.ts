import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '@/lib/errors'

export interface OrderRecord {
  id: string
  order_code: string
  customer: string
  origin: string
  destination: string
  status: string
}

const OrderCreateSchema = z.object({
  order_code: z.string().min(1),
  customer: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  status: z.string().default('new'),
})

const OrderUpdateSchema = z.object({
  customer: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  status: z.string().optional(),
})

export type OrderCreateInput = z.infer<typeof OrderCreateSchema>
export type OrderUpdateInput = z.infer<typeof OrderUpdateSchema>

export function parseOrderCreate(data: unknown): OrderCreateInput {
  return OrderCreateSchema.parse(data)
}

export async function createOrder(input: OrderCreateInput): Promise<{ id: string }> {
  const d = parseOrderCreate(input)
  await prisma.$executeRaw`INSERT INTO orders (order_code, customer, origin, destination, status) VALUES (${d.order_code}, ${d.customer}, ${d.origin}, ${d.destination}, ${d.status})`
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM orders WHERE order_code = ${d.order_code} LIMIT 1`
  if (!rows.length) throw new AppError(500, 'Order not created')
  return { id: rows[0].id }
}

export async function getOrderByCode(order_code: string): Promise<OrderRecord | null> {
  const rows = await prisma.$queryRaw<Array<OrderRecord>>`SELECT id, order_code, customer, origin, destination, status FROM orders WHERE order_code = ${order_code} LIMIT 1`
  return rows[0] ?? null
}

export async function updateOrder(order_code: string, patch: OrderUpdateInput): Promise<OrderRecord | null> {
  const p = OrderUpdateSchema.parse(patch)
  const sets: Prisma.Sql[] = []
  if (p.customer) sets.push(Prisma.sql`customer = ${p.customer}`)
  if (p.origin) sets.push(Prisma.sql`origin = ${p.origin}`)
  if (p.destination) sets.push(Prisma.sql`destination = ${p.destination}`)
  if (p.status) sets.push(Prisma.sql`status = ${p.status}`)
  if (!sets.length) return getOrderByCode(order_code)
  const q = Prisma.sql`UPDATE orders SET ${Prisma.join(sets, ', ')} WHERE order_code = ${order_code}`
  await prisma.$executeRaw(q)
  return getOrderByCode(order_code)
}

export async function deleteOrder(order_code: string): Promise<boolean> {
  const affected = await prisma.$executeRaw`DELETE FROM orders WHERE order_code = ${order_code}`
  return Number(affected) > 0
}