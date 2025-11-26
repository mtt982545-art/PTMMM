import { prisma } from '../lib/prisma'
import { insertScanEvent } from '../lib/services/scan-service'
import { setShipmentRoutePathAndLeg } from '../lib/services/shipments-service'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000)
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000)
}

const SHOULD_LOG_SEED = process.env.NODE_ENV !== 'production'

// Logging seed aman (gated di production), tanpa data sensitif
function logSeedScanEvent(status: 'created' | 'duplicate', input: {
  eventType: string
  idempotencyKey: string
  shipmentId?: string
  warehouseId?: string
  ts?: string
}) {
  if (!SHOULD_LOG_SEED) return
  console.log('[seed][scan_event]', JSON.stringify({ status, type: input.eventType, key: input.idempotencyKey, shipmentId: input.shipmentId ?? null, warehouseId: input.warehouseId ?? null, ts: input.ts ?? null }))
}

// Wrapper seed untuk menulis scan_event secara idempotent dan logging aman
export async function seedScanEventForShipment(input: {
  formCode: string
  shipmentId?: string
  warehouseId?: string
  eventType: 'gate_in' | 'gate_out' | 'load_start' | 'load_finish' | 'scan' | 'pod'
  refType?: string
  payload?: Record<string, any>
  userEmail?: string
  idempotencyKey: string
  ts?: string
}) {
  const SeedScanEventSchema = z.object({
    formCode: z.string().min(1),
    shipmentId: z.string().optional(),
    warehouseId: z.string().optional(),
    eventType: z.enum(['gate_in','gate_out','load_start','load_finish','scan','pod']),
    refType: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    userEmail: z.string().email().optional(),
    idempotencyKey: z.string().min(1),
    ts: z.string().optional(),
  })
  try {
    const parsed = SeedScanEventSchema.parse(input)
    const payload = { ...(parsed.payload || {}), idempotency_key: parsed.idempotencyKey }
    await insertScanEvent({ ...parsed, payload })
    logSeedScanEvent('created', parsed)
    return 'created' as const
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('Duplicate event')) {
      const safe = (() => { try { return SeedScanEventSchema.parse(input) } catch { return input } })()
      logSeedScanEvent('duplicate', safe as any)
      return 'duplicate' as const
    }
    throw e
  }
}

async function seedCore() {
  console.log('Seeding core master data (organization, warehouses, vendors, vehicles, drivers)...')

  // 1) Organization
  const org = await prisma.organization.upsert({
    where: { code: 'PTMMM' },
    update: {},
    create: {
      code: 'PTMMM',
      name: 'PT Mitramulia Makmur',
    },
  })

  // 2) Warehouses
  const whSby = await prisma.warehouse.upsert({
    where: {
      uq_wh_org_code: {
        organizationId: org.id,
        code: 'WH-SBY',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: 'WH-SBY',
      name: 'Gudang Surabaya',
    },
  })

  const whSda = await prisma.warehouse.upsert({
    where: {
      uq_wh_org_code: {
        organizationId: org.id,
        code: 'WH-SDA',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: 'WH-SDA',
      name: 'Gudang Sidoarjo',
    },
  })

  const whNgj = await prisma.warehouse.upsert({
    where: {
      uq_wh_org_code: {
        organizationId: org.id,
        code: 'WH-NGJ',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: 'WH-NGJ',
      name: 'Gudang Nganjuk',
    },
  })

  const whSgs = await prisma.warehouse.upsert({
    where: {
      uq_wh_org_code: {
        organizationId: org.id,
        code: 'WH-SGS',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: 'WH-SGS',
      name: 'Gudang Singosari',
    },
  })

  const whSrg = await prisma.warehouse.upsert({
    where: {
      uq_wh_org_code: {
        organizationId: org.id,
        code: 'WH-SRG',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: 'WH-SRG',
      name: 'Gudang Serang',
    },
  })

  // 3) Logistic vendor (ekspedisi eksternal)
  const vendorExt = await prisma.logisticVendor.upsert({
    where: {
      uq_vendor_org_code: {
        organizationId: org.id,
        code: 'V-EXT-001',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: 'V-EXT-001',
      name: 'Ekspedisi Demo External',
      contactName: 'Bapak Vendor',
      contactPhone: '0800-000-000',
    },
  })

  // 4) Vehicles
  const vehicleInternal = await prisma.vehicle.upsert({
    where: {
      uq_vehicle_org_plate: {
        organizationId: org.id,
        plateNumber: 'L 1234 XX',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plateNumber: 'L 1234 XX',
      name: 'TRUCK-01',
      type: 'Engkel',
      capacityKg: new Prisma.Decimal(8000),
      capacityM3: new Prisma.Decimal(15),
      isInternal: true,
    },
  })

  const vehicleExternal = await prisma.vehicle.upsert({
    where: {
      uq_vehicle_org_plate: {
        organizationId: org.id,
        plateNumber: 'B 9876 ZZ',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plateNumber: 'B 9876 ZZ',
      name: 'TRUCK-VENDOR-01',
      type: 'Fuso',
      capacityKg: new Prisma.Decimal(12000),
      capacityM3: new Prisma.Decimal(25),
      isInternal: false,
      vendorId: vendorExt.id,
    },
  })

  // 5) Driver profiles (internal & vendor)
  const driverInternal = await prisma.driverProfile.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001',
    },
    update: {
      organizationId: org.id,
      name: 'Driver Internal',
      isInternal: true,
      defaultVehicleId: vehicleInternal.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      organizationId: org.id,
      supabaseUserId: '11111111-1111-1111-1111-111111111111', // placeholder Supabase user
      name: 'Driver Internal',
      phone: '0812-0000-0001',
      isInternal: true,
      defaultVehicleId: vehicleInternal.id,
    },
  })

  const driverExternal = await prisma.driverProfile.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000002',
    },
    update: {
      organizationId: org.id,
      name: 'Driver Vendor',
      isInternal: false,
      vendorId: vendorExt.id,
      defaultVehicleId: vehicleExternal.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      organizationId: org.id,
      name: 'Driver Vendor',
      phone: '0813-0000-0002',
      isInternal: false,
      vendorId: vendorExt.id,
      defaultVehicleId: vehicleExternal.id,
    },
  })

  return {
    org,
    whSby,
    whSda,
    whNgj,
    whSgs,
    whSrg,
    vendorExt,
    vehicleInternal,
    vehicleExternal,
    driverInternal,
    driverExternal,
  }
}

async function seedOrdersAndShipments(core: any) {
  console.log('Seeding orders, shipments, routes, QR, shipment items, scan events...')

  const {
    org,
    whSby,
    whSda,
    whNgj,
    whSgs,
    whSrg,
    driverInternal,
    vehicleInternal,
  } = core

  // 1) Order & shipment single-leg: Surabaya -> Jakarta
  const order1 = await prisma.order.upsert({
    where: {
      uq_orders_org_code: {
        organizationId: org.id,
        orderCode: 'ORD-001',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      warehouseId: whSby.id,
      orderCode: 'ORD-001',
      customer: 'PT Demo',
      origin: 'Surabaya',
      destination: 'Jakarta',
      status: 'new',
    },
  })

  const shipment1 = await prisma.shipment.upsert({
    where: {
      uq_ship_org_id: {
        organizationId: org.id,
        shipmentId: 'SHP-001',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      warehouseId: whSby.id,
      shipmentId: 'SHP-001',
      customer: 'PT Demo',
      origin: 'Surabaya',
      destination: 'Jakarta',
      status: 'in_transit',
    },
  })

  // 2) Route multi-gudang: SDA -> NGJ -> SGS -> SRG (driver internal)
  const route = await prisma.route.upsert({
    where: {
      uq_route_org_code: {
        organizationId: org.id,
        code: 'RT-SDA-NGJ-SGS-SRG-001',
      },
    },
    update: {
      status: 'on_route',
      driverName: driverInternal.name,
      vehicleId: vehicleInternal.name ?? 'TRUCK-01',
      isExternal: false,
    },
    create: {
      organizationId: org.id,
      code: 'RT-SDA-NGJ-SGS-SRG-001',
      description: 'Demo rute multi-gudang: Sidoarjo -> Nganjuk -> Singosari -> Serang',
      status: 'on_route',
      driverName: driverInternal.name,
      vehicleId: vehicleInternal.name ?? 'TRUCK-01',
      isExternal: false,
      vendorName: null,
    },
  })

  // 3) Shipment kedua mengikuti route multi-gudang
  const shipmentRoute = await prisma.shipment.upsert({
    where: {
      uq_ship_org_id: {
        organizationId: org.id,
        shipmentId: 'SHP-ROUTE-001',
      },
    },
    update: {
      routeId: route.id,
    },
    create: {
      organizationId: org.id,
      warehouseId: whSda.id,
      routeId: route.id,
      shipmentId: 'SHP-ROUTE-001',
      customer: 'PT Multi Stop',
      origin: 'Sidoarjo',
      destination: 'Serang',
      status: 'in_transit',
    },
  })

  // Set route_path multi-gudang secara type-safe; mulai dari leg 0
  await setShipmentRoutePathAndLeg('SHP-ROUTE-001', ['WH-SDA','WH-NGJ','WH-SGS','WH-SRG'], 0)

  
  const now = new Date()
  const sdaArrival = hoursAgo(3)
  const sdaDepart = hoursAgo(2)
  const ngjArrival = hoursAgo(2)
  const ngjDepart = new Date(Date.now() - 90 * 60 * 1000)
  const sgsArrival = new Date(Date.now() - 90 * 60 * 1000)
  const sgsDepart = hoursAgo(1)
  const srgArrival = new Date(Date.now() - 30 * 60 * 1000)
  const srgDepart = now

  async function upsertRouteStop(routeId: string, stopSeq: number, warehouseId: string, plannedArrival: Date, plannedDeparture: Date) {
    return prisma.routeStop.upsert({
      where: { uq_route_stop_seq: { routeId, stopSeq } },
      update: { plannedArrival, plannedDeparture },
      create: { routeId, stopSeq, warehouseId, plannedArrival, plannedDeparture },
    })
  }
  const stop1 = await upsertRouteStop(route.id, 1, whSda.id, sdaArrival, sdaDepart)

  const stop2 = await upsertRouteStop(route.id, 2, whNgj.id, ngjArrival, ngjDepart)

  const stop3 = await upsertRouteStop(route.id, 3, whSgs.id, sgsArrival, sgsDepart)

  const stop4 = await upsertRouteStop(route.id, 4, whSrg.id, srgArrival, srgDepart)

  // 5) QR Ticket untuk shipment route
  const qrTicket = await prisma.qrTicket.upsert({
    where: {
      token: 'QR-SHP-ROUTE-001-DEMO',
    },
    update: {
      status: 'active',
      organizationId: org.id,
      warehouseId: whSda.id,
      shipmentId: shipmentRoute.id,
    },
    create: {
      organizationId: org.id,
      warehouseId: whSda.id,
      shipmentId: shipmentRoute.id,
      token: 'QR-SHP-ROUTE-001-DEMO',
      status: 'active',
      createdBy: 'ops@ptmmm.co.id',
    },
  })

  // 6) Shipment items untuk SHP-001 (single-leg)
  await prisma.shipmentItem.createMany({
    data: [
      {
        shipmentId: shipment1.id,
        organizationId: org.id,
        warehouseId: whSby.id,
        productCode: 'PROD-A',
        productName: 'Produk A (contoh karton)',
        uom: 'COLLY',
        collyCount: 10,
        qtyUnit: new Prisma.Decimal(100),
        weightKg: new Prisma.Decimal(150),
        volumeM3: new Prisma.Decimal(1.2),
        notes: 'Contoh muatan utama',
      },
      {
        shipmentId: shipment1.id,
        organizationId: org.id,
        warehouseId: whSby.id,
        productCode: 'PROD-B',
        productName: 'Produk B (contoh dus kecil)',
        uom: 'COLLY',
        collyCount: 5,
        qtyUnit: new Prisma.Decimal(50),
        weightKg: new Prisma.Decimal(80),
        volumeM3: new Prisma.Decimal(0.6),
        notes: 'Barang pelengkap',
      },
    ],
    skipDuplicates: true,
  })

  // 7) Shipment items untuk SHP-ROUTE-001 (multi-stop)
  await prisma.shipmentItem.createMany({
    data: [
      {
        shipmentId: shipmentRoute.id,
        routeStopId: stop1.id,
        organizationId: org.id,
        warehouseId: whSda.id,
        productCode: 'PROD-C',
        productName: 'Produk C (diambil di SDA)',
        uom: 'COLLY',
        collyCount: 8,
        qtyUnit: new Prisma.Decimal(80),
        weightKg: new Prisma.Decimal(120),
        volumeM3: new Prisma.Decimal(0.9),
        notes: 'Muatan dari Sidoarjo',
      },
      {
        shipmentId: shipmentRoute.id,
        routeStopId: stop2.id,
        organizationId: org.id,
        warehouseId: whNgj.id,
        productCode: 'PROD-D',
        productName: 'Produk D (diambil di Nganjuk)',
        uom: 'COLLY',
        collyCount: 6,
        qtyUnit: new Prisma.Decimal(60),
        weightKg: new Prisma.Decimal(90),
        volumeM3: new Prisma.Decimal(0.7),
        notes: 'Muatan tambahan dari Nganjuk',
      },
    ],
    skipDuplicates: true,
  })

  // 8) Scan events untuk SHP-001 (single-leg) via service (idempotensi + advance leg)
  await seedScanEventForShipment({
    formCode: 'FORM-OPS-001',
    shipmentId: 'SHP-001',
    warehouseId: 'WH-SBY',
    eventType: 'gate_in',
    refType: 'Gate',
    payload: { location: 'Surabaya', description: 'Kendaraan masuk gerbang', idempotency_key: 'seed:SHP-001:gate_in' },
    userEmail: 'security@ptmmm.co.id',
    idempotencyKey: 'seed:SHP-001:gate_in',
    ts: daysAgo(3).toISOString(),
  })
  await seedScanEventForShipment({
    formCode: 'FORM-OPS-001',
    shipmentId: 'SHP-001',
    warehouseId: 'WH-SBY',
    eventType: 'load_start',
    refType: 'Warehouse',
    payload: { location: 'Gudang SBY', description: 'Mulai muat', idempotency_key: 'seed:SHP-001:load_start' },
    userEmail: 'warehouse@ptmmm.co.id',
    idempotencyKey: 'seed:SHP-001:load_start',
    ts: daysAgo(2).toISOString(),
  })
  await seedScanEventForShipment({
    formCode: 'FORM-OPS-001',
    shipmentId: 'SHP-001',
    warehouseId: 'WH-SBY',
    eventType: 'gate_out',
    refType: 'Gate',
    payload: { location: 'Surabaya', description: 'Kendaraan keluar', idempotency_key: 'seed:SHP-001:gate_out' },
    userEmail: 'security@ptmmm.co.id',
    idempotencyKey: 'seed:SHP-001:gate_out',
    ts: daysAgo(1).toISOString(),
  })
  await seedScanEventForShipment({
    formCode: 'FORM-OPS-001',
    shipmentId: 'SHP-001',
    warehouseId: 'WH-SBY',
    eventType: 'pod',
    refType: 'POD',
    payload: { location: 'Jakarta', description: 'Proof of Delivery diterima', customer: 'PT Demo', origin: 'Surabaya', destination: 'Jakarta', idempotency_key: 'seed:SHP-001:pod' },
    userEmail: 'driver@ptmmm.co.id',
    idempotencyKey: 'seed:SHP-001:pod',
    ts: new Date().toISOString(),
  })

  // 9) Scan events untuk SHP-ROUTE-001 via service (idempotensi + advance leg)
  await seedScanEventForShipment({
    formCode: 'QR-SHP-ROUTE-001-DEMO',
    shipmentId: 'SHP-ROUTE-001',
    warehouseId: 'WH-SDA',
    eventType: 'gate_in',
    refType: 'Gate',
    payload: { location: 'WH-SDA', description: 'Gate in Sidoarjo', idempotency_key: 'seed:SHP-ROUTE-001:sda:gate_in' },
    userEmail: 'security-sda@ptmmm.co.id',
    idempotencyKey: 'seed:SHP-ROUTE-001:sda:gate_in',
    ts: sdaArrival.toISOString(),
  })
  await seedScanEventForShipment({
    formCode: 'QR-SHP-ROUTE-001-DEMO',
    shipmentId: 'SHP-ROUTE-001',
    warehouseId: 'WH-SDA',
    eventType: 'load_finish',
    refType: 'Warehouse',
    payload: { location: 'WH-SDA', description: 'Selesai muat di Sidoarjo', idempotency_key: 'seed:SHP-ROUTE-001:sda:load_finish' },
    userEmail: 'warehouse-sda@ptmmm.co.id',
    idempotencyKey: 'seed:SHP-ROUTE-001:sda:load_finish',
    ts: sdaDepart.toISOString(),
  })
  await seedScanEventForShipment({
    formCode: 'QR-SHP-ROUTE-001-DEMO',
    shipmentId: 'SHP-ROUTE-001',
    warehouseId: 'WH-NGJ',
    eventType: 'gate_in',
    refType: 'Gate',
    payload: { location: 'WH-NGJ', description: 'Gate in Nganjuk', idempotency_key: 'seed:SHP-ROUTE-001:ngj:gate_in' },
    userEmail: 'security-ngj@ptmmm.co.id',
    idempotencyKey: 'seed:SHP-ROUTE-001:ngj:gate_in',
    ts: ngjArrival.toISOString(),
  })
  await seedScanEventForShipment({
    formCode: 'QR-SHP-ROUTE-001-DEMO',
    shipmentId: 'SHP-ROUTE-001',
    warehouseId: 'WH-NGJ',
    eventType: 'scan',
    refType: 'transfer',
    payload: { location: 'WH-NGJ', description: 'Transfer ke WH-SGS', transfer_to: 'WH-SGS', idempotency_key: 'seed:SHP-ROUTE-001:ngj:transfer' },
    userEmail: 'ops-ngj@ptmmm.co.id',
    idempotencyKey: 'seed:SHP-ROUTE-001:ngj:transfer',
    ts: ngjDepart.toISOString(),
  })
  await seedScanEventForShipment({
    formCode: 'QR-SHP-ROUTE-001-DEMO',
    shipmentId: 'SHP-ROUTE-001',
    warehouseId: 'WH-SRG',
    eventType: 'gate_out',
    refType: 'Gate',
    payload: { location: 'WH-SRG', description: 'Gate out Serang (finish route)', idempotency_key: 'seed:SHP-ROUTE-001:srg:gate_out' },
    userEmail: 'security-srg@ptmmm.co.id',
    idempotencyKey: 'seed:SHP-ROUTE-001:srg:gate_out',
    ts: srgDepart.toISOString(),
  })
}

async function seedKpi(core: any) {
  console.log('Seeding simple KPI demo rows...')

  const { org, whSby } = core
  const today = new Date()
  const dataDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Inventory KPI contoh untuk 1 produk di 1 gudang (idempoten)
  await prisma.inventoryKpiDaily.createMany({
    data: [
      {
        dataDate,
        orgId: org.id,
        warehouseId: whSby.id,
        productId: 'PROD-A',
        openingQty: new Prisma.Decimal(100),
        receivedQty: new Prisma.Decimal(50),
        shippedQty: new Prisma.Decimal(80),
        adjustmentQty: new Prisma.Decimal(0),
        closingQty: new Prisma.Decimal(70),
        stockoutEvents: 0,
        avgLeadTimeDays: new Prisma.Decimal(2),
        inventoryTurnover: new Prisma.Decimal(5),
        etlTimestamp: new Date(),
        batchId: 'BATCH-KPI-DEMO-1',
      },
    ],
    skipDuplicates: true,
  })

  // Fleet KPI contoh untuk 1 kendaraan (idempoten)
  await prisma.fleetKpiDaily.createMany({
    data: [
      {
        dataDate,
        orgId: org.id,
        warehouseId: whSby.id,
        vehicleId: 'TRUCK-01',
        isExternal: false,
        vendorId: null,
        totalTrips: 2,
        loadedTrips: 2,
        ontimeDeliveries: 2,
        lateDeliveries: 0,
        ontimeRate: new Prisma.Decimal(100),
        avgTripDistanceKm: new Prisma.Decimal(120),
        avgTripDurationHours: new Prisma.Decimal(5),
        utilizationRate: new Prisma.Decimal(60),
        totalDistanceKm: new Prisma.Decimal(240),
        totalCost: new Prisma.Decimal(1_000_000),
        costPerKm: new Prisma.Decimal(4166.67),
        etlTimestamp: new Date(),
        batchId: 'BATCH-KPI-DEMO-1',
      },
    ],
    skipDuplicates: true,
  })
}

async function main() {
  const core = await seedCore()
  await seedOrdersAndShipments(core)
  await seedKpi(core)
}

main()
  .then(async () => {
    console.log('✅ Seed selesai')
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed error', e)
    await prisma.$disconnect()
    process.exit(1)
  })
