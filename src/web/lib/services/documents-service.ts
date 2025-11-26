import { prisma } from '@/lib/prisma'
import type { UserContext } from '@/lib/types'
import { isInOrgWarehouseScope } from '@/lib/auth/server-auth'
import { AppError } from '@/lib/errors'

export async function createInvoiceForShipment(ctx: UserContext, shipmentInternalId: string, payload: { invoiceNo: string; invoiceType?: string; amount?: number }) {
  const orgId = ctx.orgId
  const metadata = { type: payload.invoiceType || 'standard', amount: payload.amount ?? null }
  const doc = await (prisma as any).document.create({
    data: {
      organizationId: orgId,
      shipmentId: shipmentInternalId,
      docType: 'invoice',
      refCode: payload.invoiceNo,
      metadata,
      createdBy: ctx.email,
    },
  })
  return doc
}

export async function attachSuratJalan(ctx: UserContext, input: { shipmentInternalId?: string; routeId?: string; suratNumber: string; path?: string; metadata?: Record<string, any> }) {
  const data: any = {
    organizationId: ctx.orgId,
    shipmentId: input.shipmentInternalId || null,
    routeId: input.routeId || null,
    docType: 'surat_jalan',
    refCode: input.suratNumber,
    path: input.path || null,
    metadata: input.metadata || null,
    createdBy: ctx.email,
  }
  const doc = await (prisma as any).document.create({ data })
  return doc
}

export async function linkScheduleToShipment(ctx: UserContext, shipmentInternalId: string, scheduleId: string) {
  let allowed = false
  try {
    const sched = await (prisma as any).routeSchedule.findUnique({ where: { id: scheduleId }, select: { organizationId: true, warehouseId: true } })
    allowed = !!sched && isInOrgWarehouseScope(ctx, sched.organizationId, sched.warehouseId)
  } catch {}
  if (!allowed) throw new AppError(403, 'Forbidden')
  const doc = await (prisma as any).document.create({
    data: {
      organizationId: ctx.orgId,
      shipmentId: shipmentInternalId,
      docType: 'route_schedule',
      refCode: scheduleId,
      metadata: null,
      createdBy: ctx.email,
    },
  })
  return doc
}

export async function getShipmentDocumentsForSecurity(shipmentInternalId: string) {
  const docs = await (prisma as any).document.findMany({ where: { shipmentId: shipmentInternalId }, orderBy: { createdAt: 'desc' } })
  const invoice = docs.find((d: any) => d.docType === 'invoice') || null
  const surat = docs.find((d: any) => d.docType === 'surat_jalan') || null
  const scheduleDoc = docs.find((d: any) => d.docType === 'route_schedule') || null
  return { invoice, surat, scheduleDoc }
}
