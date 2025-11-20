import { prisma } from '../lib/prisma'

async function seedScanEvents() {
  const base = new Date()
  const users = ['admin@example.com']
  const warehouses = ['WH001','WH002']
  const shipments = ['SHP-001','SHP-002']
  const forms = ['FORM-OPS-001','FORM-OPS-002']
  const events = [
    { eventType: 'gate_in' },
    { eventType: 'load_start' },
    { eventType: 'load_finish' },
    { eventType: 'gate_out' },
    { eventType: 'scan' }
  ]
  for (let d = 0; d < 7; d++) {
    const day = new Date(base)
    day.setDate(base.getDate() - d)
    for (const formCode of forms) {
      for (const event of events) {
        await prisma.scanEvent.create({
          data: {
            formCode,
            shipmentId: shipments[(d + events.indexOf(event)) % shipments.length],
            warehouseId: warehouses[(d + events.indexOf(event)) % warehouses.length],
            eventType: event.eventType,
            payload: { idempotency_key: `${formCode}-${event.eventType}-${day.toISOString()}` },
            userEmail: users[0],
            createdAt: day,
          }
        })
      }
    }
  }
}

async function seedEtl() {
  const imp = await prisma.spreadsheetImport.create({
    data: {
      source: 'apps_script',
      sheetName: 'Orders',
      rows: 5,
      status: 'done',
      meta: { note: 'seed' }
    }
  })
  const rows = [
    { order_id: 'ORD-001', route: 'JKT→BDG', customer: 'PT Demo', eta_days: 2 },
    { order_id: 'ORD-002', route: 'BDG→SMG', customer: 'PT Demo', eta_days: 1 },
    { order_id: 'ORD-003', route: 'SMG→SLO', customer: 'PT Demo', eta_days: 1 },
    { order_id: 'ORD-004', route: 'SLO→SBY', customer: 'PT Demo', eta_days: 1 },
    { order_id: 'ORD-005', route: 'SBY→DEN', customer: 'PT Demo', eta_days: 3 }
  ]
  await prisma.spreadsheetRow.createMany({
    data: rows.map((r, i) => ({ importId: imp.id, rowIndex: i + 1, data: r }))
  })
}

async function main() {
  await seedScanEvents()
  await seedEtl()
}

main().then(async () => {
  await prisma.$disconnect()
}).catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})