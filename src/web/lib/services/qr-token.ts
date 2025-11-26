import { prisma } from '@/lib/prisma'

export function buildShipmentQrToken(input: { shipmentId: string; formCode: string; orgCode: string; warehouseCode: string; productCode?: string; invoiceNo?: string }) {
  const parts: string[] = ['QR', input.shipmentId, input.formCode]
  if (input.productCode) parts.push(input.productCode)
  parts.push(input.orgCode)
  parts.push(input.warehouseCode)
  if (input.invoiceNo) parts.push(input.invoiceNo)
  return parts.join('-')
}

export async function upsertShipmentQrToken(data: { token: string; organizationId: string; warehouseId: string; shipmentInternalId: string; createdBy?: string }) {
  await (prisma as any).qrTicket.upsert({
    where: { token: data.token },
    update: { status: 'active', organizationId: data.organizationId, warehouseId: data.warehouseId, shipmentId: data.shipmentInternalId },
    create: { organizationId: data.organizationId, warehouseId: data.warehouseId, shipmentId: data.shipmentInternalId, token: data.token, status: 'active', createdBy: data.createdBy || null },
  })
}
