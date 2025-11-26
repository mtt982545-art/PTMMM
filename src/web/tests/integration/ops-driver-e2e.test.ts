import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  let legCall = 0
  const $queryRaw = vi.fn(async (q: any) => {
    const s = String(q)
    if (s.includes('SELECT id FROM shipments WHERE shipment_id')) return [{ id: 'SHIP-1' }]
    if (s.includes('SELECT id FROM warehouse WHERE code')) {
      if (s.includes('WH-PTMMM-ORI')) return [{ id: 'WORI' }]
      if (s.includes('WH-AVIAN-DEST')) return [{ id: 'WDEST' }]
      return [{ id: 'WUNK' }]
    }
    if (s.includes('SELECT route_path, current_leg_index FROM shipments WHERE shipment_id')) {
      legCall++
      if (legCall === 1) return [{ route_path: ['WH-PTMMM-ORI','WH-AVIAN-DEST'], current_leg_index: 0 }]
      return [{ route_path: ['WH-PTMMM-ORI','WH-AVIAN-DEST'], current_leg_index: 1 }]
    }
    if (s.includes('SELECT current_leg_index FROM shipments WHERE shipment_id')) {
      return [{ current_leg_index: legCall === 0 ? 0 : 1 }]
    }
    return []
  })
  const $executeRaw = vi.fn(async () => 1)
  const scanEvent = { create: vi.fn(async (args: any) => ({ id: 'EVT-1', ...args.data })) }
  const shipmentItem = { findMany: vi.fn(async () => [{ warehouseId: 'WORI', productCode: 'PRD-1', qtyUnit: 10, uom: 'KG' }]) }
  const shipment = { findFirst: vi.fn(async () => ({ organizationId: 'ORG-PTMMM', warehouseId: 'WORI', routeId: null, status: 'in_transit' })), findUnique: vi.fn(async () => ({ organizationId: 'ORG-PTMMM' })) }
  const inventoryMove = { create: vi.fn(async (args: any) => ({ id: 'INV-1', ...args.data })) }
  const qrTicket = { upsert: vi.fn(async (args: any) => ({ id: 'QR-1' })) }
  return { prisma: { $queryRaw, $executeRaw, scanEvent, shipmentItem, shipment, inventoryMove, qrTicket } }
})

import { createScanEvent } from '@/lib/services/scan-service'
import { getDriverTasks, createShipmentWithAccess } from '@/lib/services/shipments-service'
import { prisma } from '@/lib/prisma'

describe('Ops–Driver E2E minimal scan→inventory', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('records out at origin load_finish and in at destination gate_in', async () => {
    await createScanEvent({ formCode: 'F-1', shipmentId: 'SHP-ROUTE-1', warehouseId: 'WH-PTMMM-ORI', eventType: 'load_finish', payload: {}, userEmail: 'ops@ptmmm.co' } as any)
    await createScanEvent({ formCode: 'F-1', shipmentId: 'SHP-ROUTE-1', warehouseId: 'WH-AVIAN-DEST', eventType: 'gate_in', payload: {}, userEmail: 'security.avn1@avian.co.id' } as any)
    const invCalls = ((prisma as any).inventoryMove.create as any).mock.calls
    expect(invCalls.length).toBeGreaterThanOrEqual(1)
    const last = invCalls[invCalls.length - 1][0].data
    expect(last.direction).toBe('in')
    expect(last.warehouseId).toBeTruthy()
  })

  it('marketing creates shipment & QR → driver sees task via schedule doc', async () => {
    const ctx: any = { id: 'DRV-1', email: 'driver1@ptmmm.co', role: 'driver', orgId: 'ORG-PTMMM', warehouseIds: ['WORI'], sectionsAllowed: ['shipments'] }
    ;((prisma as any).$queryRaw as any).mockImplementation(async (q: any) => {
      const s = String(q)
      if (s.includes('FROM document d')) {
        return [{ shipment_id: 'SHP-ROUTE-1', customer: 'PT Demo', origin: 'SBY', destination: 'JKT', status: 'in_transit', warehouse_id: 'WORI' }]
      }
      if (s.includes('FROM tracking_ping')) return []
      if (s.includes('FROM scan_event')) return []
      if (s.includes('SELECT id FROM shipments WHERE shipment_id')) return [{ id: 'SHIP-1' }]
      if (s.includes('SELECT id FROM warehouse WHERE code')) return [{ id: 'WORI' }]
      if (s.includes('SELECT route_path')) return [{ route_path: ['WORI','WDEST'], current_leg_index: 0 }]
      if (s.includes('SELECT current_leg_index')) return [{ current_leg_index: 0 }]
      return []
    })
    const tasks = await getDriverTasks(ctx, { onlyActive: true })
    expect(tasks.some((t) => t.shipment_id === 'SHP-ROUTE-1')).toBe(true)
  })

  it('marketing1 → driver → security origin → ops origin → security tujuan → ops tujuan → driver POD', async () => {
    const mktCtx: any = { id: 'MKT-1', email: 'marketing1@ptmmm.co', role: 'marketing', orgId: 'ORG-PTMMM', warehouseIds: ['WORI'], sectionsAllowed: ['shipments','kpi','orders'] }
    let legIdx = 0
    ;((prisma as any).$queryRaw as any).mockImplementation(async (q: any) => {
      const s = String(q)
      if (s.includes('SELECT id FROM shipments WHERE shipment_id')) return [{ id: 'SHIP-FLOW-1' }]
      if (s.includes('SELECT organization_id, warehouse_id FROM shipments')) return [{ organization_id: 'ORG-PTMMM', warehouse_id: 'WORI' }]
      if (s.includes('SELECT id FROM warehouse WHERE code')) {
        if (s.includes('WH-PTMMM-ORI')) return [{ id: 'WORI' }]
        if (s.includes('WH-AVIAN-DEST')) return [{ id: 'WDEST' }]
        return [{ id: 'WUNK' }]
      }
      if (s.includes('FROM document d')) {
        return [{ shipment_id: 'SHP-FLOW-1', customer: 'PT Flow', origin: 'SBY', destination: 'JKT', status: 'in_transit', warehouse_id: 'WORI' }]
      }
      if (s.includes('SELECT route_path, current_leg_index FROM shipments')) return [{ route_path: ['WH-PTMMM-ORI','WH-AVIAN-DEST'], current_leg_index: legIdx }]
      if (s.includes('SELECT current_leg_index FROM shipments')) return [{ current_leg_index: legIdx }]
      if (s.includes('FROM tracking_ping')) return []
      if (s.includes('FROM scan_event')) return []
      return []
    })
    const created = await createShipmentWithAccess(mktCtx, { shipment_id: 'SHP-FLOW-1', customer: 'PT Flow', origin: 'SBY', destination: 'JKT', status: 'in_transit' })
    expect(created.id).toBeDefined()
    const qrCalls = ((prisma as any).qrTicket.upsert as any).mock.calls
    expect(qrCalls.length).toBeGreaterThan(0)
    const lastQr = qrCalls[qrCalls.length - 1][0]
    expect(lastQr.create.createdBy).toBe('marketing1@ptmmm.co')

    await createScanEvent({ formCode: 'FORM-OPS-001', shipmentId: 'SHP-FLOW-1', warehouseId: 'WH-PTMMM-ORI', eventType: 'gate_in', payload: {}, userEmail: 'security1@ptmmm.co' } as any)
    await createScanEvent({ formCode: 'FORM-OPS-001', shipmentId: 'SHP-FLOW-1', warehouseId: 'WH-PTMMM-ORI', eventType: 'load_start', payload: {}, userEmail: 'ops@ptmmm.co' } as any)
    await createScanEvent({ formCode: 'FORM-OPS-001', shipmentId: 'SHP-FLOW-1', warehouseId: 'WH-PTMMM-ORI', eventType: 'load_finish', payload: {}, userEmail: 'ops@ptmmm.co' } as any)
    await createScanEvent({ formCode: 'FORM-OPS-001', shipmentId: 'SHP-FLOW-1', warehouseId: 'WH-PTMMM-ORI', eventType: 'gate_out', payload: {}, userEmail: 'security1@ptmmm.co' } as any)

    legIdx = 1
    await createScanEvent({ formCode: 'FORM-OPS-001', shipmentId: 'SHP-FLOW-1', warehouseId: 'WH-AVIAN-DEST', eventType: 'gate_in', payload: {}, userEmail: 'security.avn1@avian.co.id' } as any)
    await createScanEvent({ formCode: 'FORM-OPS-001', shipmentId: 'SHP-FLOW-1', warehouseId: 'WH-AVIAN-DEST', eventType: 'load_start', payload: {}, userEmail: 'ops.avn1@avian.co.id' } as any)
    await createScanEvent({ formCode: 'FORM-OPS-001', shipmentId: 'SHP-FLOW-1', warehouseId: 'WH-AVIAN-DEST', eventType: 'load_finish', payload: {}, userEmail: 'ops.avn1@avian.co.id' } as any)
    await createScanEvent({ formCode: 'FORM-OPS-001', shipmentId: 'SHP-FLOW-1', warehouseId: 'WH-AVIAN-DEST', eventType: 'pod', payload: {}, userEmail: 'driver1@ptmmm.co' } as any)

    const invCalls = ((prisma as any).inventoryMove.create as any).mock.calls.map((c: any) => c[0].data)
    expect(invCalls.length).toBeGreaterThanOrEqual(2)

    const drvCtx: any = { id: 'DRV-1', email: 'driver1@ptmmm.co', role: 'driver', orgId: 'ORG-PTMMM', warehouseIds: ['WORI'], sectionsAllowed: ['shipments'] }
    const tasks = await getDriverTasks(drvCtx, { onlyActive: true })
    expect(tasks.some((t) => t.shipment_id === 'SHP-FLOW-1')).toBe(true)
  })
})
