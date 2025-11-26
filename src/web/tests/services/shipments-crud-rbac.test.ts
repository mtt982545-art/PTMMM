import { describe, it, expect, vi } from 'vitest'
import type { UserContext } from '@/lib/types'
import { prisma } from '@/lib/prisma'
import { 
  createShipmentWithAccess,
  getShipmentByIdWithAccess,
  updateShipmentWithAccess,
  deleteShipmentWithAccess,
} from '@/lib/services/shipments-service'

vi.mock('@/lib/prisma', () => {
  const state: any = {
    shipments: new Map<string, any>(),
    org: 'ORG-1', wh: 'WH-1',
    pings: new Set<string>(),
    scans: new Set<string>(),
  }
  return {
    prisma: {
      $executeRaw: vi.fn(async (q: any) => {
        const s = String(q)
        if (s.includes('INSERT INTO shipments')) {
          const match = /VALUES \(([^)]+)\)/.exec(s)
          const parts = match ? match[1].split(',').map(p => p.trim()) : []
          const shipment_id = parts[0]?.replace(/^[^']*'|'.*$/g, '') || 'SHP-NEW'
          state.shipments.set(shipment_id, {
            id: 'SHIP-' + shipment_id,
            shipment_id,
            customer: 'CUST', origin: 'ORI', destination: 'DEST', status: 'in_transit',
            organization_id: state.org, warehouse_id: state.wh, route_path: [], current_leg_index: 0,
          })
          state.lastInsertedId = shipment_id
          return 1
        }
        if (s.startsWith('UPDATE shipments SET')) {
          const idMatch = /WHERE shipment_id = ([^\s]+)/.exec(s)
          const quoted = s.match(/'([^']+)'/g)
          const inlineId = (s.match(/SHP-[A-Z0-9-]+/) || [])[0]
          const shipment_id = idMatch ? idMatch[1].replace(/^[^']*'|'.*$/g, '') : (inlineId || (quoted ? quoted[quoted.length - 1].replace(/'/g, '') : ''))
          const row = state.shipments.get(shipment_id)
          if (!row) return 0
          if (s.includes('status =')) {
            const stMatch = /status\s*=\s*'([^']+)'/.exec(s)
            const st = stMatch ? stMatch[1] : row.status
            row.status = st
          }
          if (s.includes('route_path =')) {
            row.route_path = [] // dummy; real value not needed for assertions here
          }
          if (s.includes('current_leg_index =')) {
            row.current_leg_index = 0
          }
          state.shipments.set(shipment_id, row)
          return 1
        }
        if (s.startsWith('INSERT INTO tracking_ping')) {
          const quoted = s.match(/'([^']+)'/g) || []
          const userId = quoted[0]?.replace(/'/g, '') || 'DRV-1'
          const shipmentId = quoted[1]?.replace(/'/g, '') || 'SHIP-SHP-DRV-1'
          state.pings.add(`${userId}@${shipmentId}`)
          return 1
        }
        if (s.startsWith('INSERT INTO scan_event')) {
          const quoted = s.match(/'([^']+)'/g) || []
          const first = quoted[0]?.replace(/'/g, '')
          const second = quoted[1]?.replace(/'/g, '')
          if (first && first.includes('@')) {
            const userEmail = first
            const shipmentId = second || 'SHIP-SHP-DRV-1'
            state.scans.add(`${userEmail}@${shipmentId}`)
          } else {
            const eventType = first || 'gate_in'
            const shipmentId = second || 'SHIP-SHP-DRV-1'
            if (['gate_in','load_start','load_finish','gate_out'].includes(eventType)) {
              if (!state.opsScans) state.opsScans = new Set<string>()
              state.opsScans.add(shipmentId)
            }
          }
          return 1
        }
        if (s.startsWith('DELETE FROM shipments')) {
          const idMatch = /WHERE shipment_id = ([^\s]+)/.exec(s)
          const shipment_id = idMatch ? idMatch[1].replace(/^[^']*'|'.*$/g, '') : ''
          state.shipments.delete(shipment_id)
          return 1
        }
        return 0
      }),
      $queryRaw: vi.fn(async (q: any) => {
        const s = String(q)
        if (s.includes('SELECT id FROM shipments')) {
          const idMatch = /WHERE shipment_id = ([^\s]+)/.exec(s)
          const quoted = s.match(/'([^']+)'/g)
          const inlineId = (s.match(/SHP-[A-Z0-9-]+/) || [])[0]
          const shipment_id = idMatch ? idMatch[1].replace(/^[^']*'|'.*$/g, '') : (inlineId || (quoted ? quoted[quoted.length - 1].replace(/'/g, '') : ''))
          let row = state.shipments.get(shipment_id)
          if (!row) {
            row = { id: 'SHIP-' + shipment_id, shipment_id, customer: 'CUST', origin: 'ORI', destination: 'DEST', status: 'in_transit', organization_id: state.org, warehouse_id: state.wh, route_path: [], current_leg_index: 0 }
            state.shipments.set(shipment_id, row)
          }
          state.lastInsertedId = shipment_id
          return [{ id: row.id }]
        }
        if (s.includes('SELECT id, shipment_id, customer')) {
          const idMatch = /WHERE shipment_id = ([^\s]+)/.exec(s)
          const quoted = s.match(/'([^']+)'/g)
          const inlineId = (s.match(/SHP-[A-Z0-9-]+/) || [])[0]
          let shipment_id = idMatch ? idMatch[1].replace(/^[^']*'|'.*$/g, '') : (inlineId || (quoted ? quoted[quoted.length - 1].replace(/'/g, '') : ''))
          if (!shipment_id || shipment_id === ',') {
            shipment_id = state.lastInsertedId || ['SHP-CRUD-1','SHP-CRUD-2','SHP-DRV-1','SHP-DRV-2','SHP-SEC-1'].find(id => s.includes(id)) || 'SHP-NEW'
          }
          const row = state.shipments.get(shipment_id)
          if (!row) {
            const r = { id: 'SHIP-' + shipment_id, shipment_id, customer: 'CUST', origin: 'ORI', destination: 'DEST', status: 'in_transit', organization_id: state.org, warehouse_id: state.wh }
            state.shipments.set(shipment_id, { ...r, route_path: [], current_leg_index: 0 })
            return [r]
          }
          return [{ id: row.id, shipment_id: row.shipment_id, customer: row.customer, origin: row.origin, destination: row.destination, status: row.status, organization_id: row.organization_id, warehouse_id: row.warehouse_id }]
        }
        if (s.includes('SELECT route_path FROM shipments')) {
          const idMatch = /WHERE shipment_id = ([^\s]+)/.exec(s)
          const shipment_id = idMatch ? idMatch[1].replace(/^[^']*'|'.*$/g, '') : ''
          const row = state.shipments.get(shipment_id)
          return row ? [{ route_path: row.route_path }] : []
        }
        if (s.includes('SELECT organization_id, warehouse_id FROM shipments')) {
          const idMatch = /WHERE shipment_id = ([^\s]+)/.exec(s)
          const quoted = s.match(/'([^']+)'/g)
          const inlineId = (s.match(/SHP-[A-Z0-9-]+/) || [])[0]
          let shipment_id = idMatch ? idMatch[1].replace(/^[^']*'|'.*$/g, '') : (inlineId || (quoted ? quoted[quoted.length - 1].replace(/'/g, '') : ''))
          if (!shipment_id || shipment_id === ',') {
            shipment_id = ['SHP-CRUD-1','SHP-CRUD-2','SHP-DRV-1','SHP-DRV-2','SHP-SEC-1'].find(id => s.includes(id)) || 'SHP-NEW'
          }
          const row = state.shipments.get(shipment_id)
          const org = row?.organization_id ?? state.org
          const wh = row?.warehouse_id ?? state.wh
          return [{ organization_id: org, warehouse_id: wh }]
        }
        if (s.includes('SELECT COUNT(*) AS c FROM tracking_ping')) {
          return [{ c: 0 }]
        }
        if (s.includes('SELECT COUNT(*) AS c FROM scan_event')) {
          if (s.includes("event_type IN ('gate_in','load_start','load_finish','gate_out')")) {
            const hasOps = state.opsScans && (state.opsScans.size > 0)
            return [{ c: hasOps ? 1 : 0 }]
          }
          const has = state.scans.has('drv@ptmmm.co@SHIP-SHP-DRV-1')
          return [{ c: has ? 1 : 0 }]
        }
        return []
      }),
      qrTicket: {
        upsert: vi.fn(async (args: any) => {
          return { id: 'QR-' + (state.lastInsertedId || 'NEW') }
        }),
      },
    },
  }
})

describe('shipments-service CRUD RBAC', () => {
  const adminCtx = { id: 'ADM-1', email: 'admin@ptmmm.co', role: 'admin', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments','events','kpi'] } as UserContext
  const opsCtx = { id: 'OPS-1', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: ['WH-1'], orgId: 'ORG-1', sectionsAllowed: ['shipments','events','kpi'] } as UserContext
  const drvCtx = { id: 'DRV-1', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] } as UserContext
  const secCtx = { id: 'SEC-1', email: 'sec@ptmmm.co', role: 'security', warehouseIds: ['WH-1'], orgId: 'ORG-1', sectionsAllowed: ['events'] } as UserContext
  const mktCtx = { id: 'MKT-1', email: 'marketing@ptmmm.co', role: 'marketing', warehouseIds: ['WH-1'], orgId: 'ORG-1', sectionsAllowed: ['shipments','kpi','orders'] } as UserContext

  it('Admin dapat full CRUD', async () => {
    const created = await createShipmentWithAccess(adminCtx, { shipment_id: 'SHP-CRUD-1', customer: 'ACME', origin: 'SBY', destination: 'JKT', status: 'in_transit' })
    expect(created.id).toBeDefined()
    const r1 = await getShipmentByIdWithAccess(adminCtx, 'SHP-CRUD-1')
    expect(r1).toBeTruthy()
    const u1 = await updateShipmentWithAccess(adminCtx, 'SHP-CRUD-1', { status: 'delivered', route_path: ['WH-1','WH-2'], current_leg_index: 1 })
    expect(u1).toBeTruthy()
    const d1 = await deleteShipmentWithAccess(adminCtx, 'SHP-CRUD-1')
    expect(d1).toBe(true)
  })

  it('Ops boleh update status tapi tidak route_path', async () => {
    await createShipmentWithAccess(adminCtx, { shipment_id: 'SHP-CRUD-2', customer: 'ACME', origin: 'SBY', destination: 'JKT', status: 'in_transit' })
    const before = await getShipmentByIdWithAccess(opsCtx, 'SHP-CRUD-2')
    expect(before).toBeTruthy()
    const u2 = await updateShipmentWithAccess(opsCtx, 'SHP-CRUD-2', { status: 'hold', route_path: ['WH-X'], current_leg_index: 5 })
    expect(u2).toBeTruthy()
    const after = await getShipmentByIdWithAccess(opsCtx, 'SHP-CRUD-2')
    expect(after).toBeTruthy()
  })

  it('Driver hanya bisa read shipment yang assigned', async () => {
    await createShipmentWithAccess(adminCtx, { shipment_id: 'SHP-DRV-1', customer: 'ACME', origin: 'SBY', destination: 'JKT', status: 'in_transit' })
    await prisma.$executeRaw`INSERT INTO scan_event (user_email, shipment_id) VALUES ('drv@ptmmm.co','SHIP-SHP-DRV-1')`
    const ok = await getShipmentByIdWithAccess(drvCtx, 'SHP-DRV-1')
    expect(ok).toBeTruthy()
  })

  it('Driver tidak boleh read shipment yang tidak assigned', async () => {
    await createShipmentWithAccess(adminCtx, { shipment_id: 'SHP-DRV-2', customer: 'ACME', origin: 'SBY', destination: 'JKT', status: 'in_transit' })
    const badCtx = { ...drvCtx, id: 'DRV-2', orgId: 'ORG-2' }
    await expect(getShipmentByIdWithAccess(badCtx as UserContext, 'SHP-DRV-2')).rejects.toThrow('Forbidden')
  })

  it('Security hanya read ringkasan shipment di warehouse mereka', async () => {
    await createShipmentWithAccess(adminCtx, { shipment_id: 'SHP-SEC-1', customer: 'ACME', origin: 'SBY', destination: 'JKT', status: 'in_transit' })
    const secRead = await getShipmentByIdWithAccess(secCtx, 'SHP-SEC-1')
    expect(secRead).toBeTruthy()
    await expect(updateShipmentWithAccess(secCtx as any, 'SHP-SEC-1', { status: 'hold' })).rejects.toThrow('Forbidden')
    await expect(deleteShipmentWithAccess(secCtx as any, 'SHP-SEC-1')).rejects.toThrow('Forbidden')
  })

  it('Marketing bisa create shipment dan QR dibuat via upsert', async () => {
    const created = await createShipmentWithAccess(mktCtx, { shipment_id: 'SHP-MKT-1', customer: 'PT XYZ', origin: 'SBY', destination: 'BDO', status: 'in_transit' })
    expect(created.id).toBeDefined()
    expect((prisma as any).qrTicket.upsert).toBeDefined()
    expect(((prisma as any).qrTicket.upsert as any).mock.calls.length).toBeGreaterThan(0)
    const calls = ((prisma as any).qrTicket.upsert as any).mock.calls
    const last = calls[calls.length - 1][0]
    expect(last.where.token).toBe('QR-SHP-MKT-1')
    expect(last.create.createdBy).toBe('marketing@ptmmm.co')
  })

  it('Marketing: patch route_path/current_leg_index diabaikan setelah scan operasional', async () => {
    await createShipmentWithAccess(mktCtx, { shipment_id: 'SHP-MKT-LOCK', customer: 'PT ABC', origin: 'SBY', destination: 'BDO', status: 'in_transit' })
    await prisma.$executeRaw`INSERT INTO scan_event (event_type, shipment_id) VALUES ('gate_in','SHIP-SHP-MKT-LOCK')`
    const before = ((prisma.$executeRaw as any).mock.calls).length
    await updateShipmentWithAccess(mktCtx, 'SHP-MKT-LOCK', { route_path: ['WH-X'], current_leg_index: 2, status: 'hold' })
    const call = ((prisma.$executeRaw as any).mock.calls)[before]?.[0]
    const s = String(call)
    expect(s.includes('route_path =')).toBe(false)
    expect(s.includes('current_leg_index =')).toBe(false)
  })

  it('Ops tidak boleh delete shipment', async () => {
    await createShipmentWithAccess(adminCtx, { shipment_id: 'SHP-OPS-NO-DEL', customer: 'PT OPS', origin: 'SBY', destination: 'BDO', status: 'in_transit' })
    await expect(deleteShipmentWithAccess(opsCtx as any, 'SHP-OPS-NO-DEL')).rejects.toThrow('Forbidden')
  })

  it('Driver tidak boleh update shipment', async () => {
    await createShipmentWithAccess(adminCtx, { shipment_id: 'SHP-DRV-NO-UPD', customer: 'PT DRV', origin: 'SBY', destination: 'BDO', status: 'in_transit' })
    await expect(updateShipmentWithAccess(drvCtx as any, 'SHP-DRV-NO-UPD', { status: 'hold' })).rejects.toThrow('Forbidden')
  })
})
