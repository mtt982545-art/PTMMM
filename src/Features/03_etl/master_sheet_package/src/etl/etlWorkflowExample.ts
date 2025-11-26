import {
  masterWarehouseRowSchema,
  masterVendorRowSchema,
  masterVehicleRowSchema,
  masterDriverRowSchema,
  ordersRowSchema,
  shipmentsRowSchema,
  scanEventsRowSchema,
  trackingPingRowSchema,
  auditLogRowSchema,
  MasterWarehouseRow,
  MasterVendorRow,
  MasterVehicleRow,
  MasterDriverRow,
  OrdersRow,
  ShipmentsRow,
  ScanEventsRow,
  TrackingPingRow,
  AuditLogRow
} from "./masterSheetSchemas";
import {
  toWarehouseCore,
  toVendorCore,
  toVehicleCore,
  toDriverCore,
  toOrderCore,
  toShipmentCore,
  toScanEventCore,
  toTrackingPingCore,
  toAuditLogCore
} from "./masterSheetMapping";

/**
 * Interface minimal agar modul ini bisa diintegrasikan ke Prisma Client nyata.
 * Di aplikasi sesungguhnya, Anda dapat mengganti ini dengan `PrismaClient` langsung.
 */
export interface PrismaClientLike {
  warehouse: { upsert(args: any): Promise<any> };
  vendor: { upsert(args: any): Promise<any> };
  vehicle: { upsert(args: any): Promise<any> };
  driver: { upsert(args: any): Promise<any> };
  orders: { upsert(args: any): Promise<any> };
  shipments: { upsert(args: any): Promise<any> };
  scan_event: { create(args: any): Promise<any> };
  tracking_ping: { create(args: any): Promise<any> };
  audit_log: { create(args: any): Promise<any> };
}

/**
 * Contoh fungsi ETL untuk Master_Warehouse.
 */
export async function etlMasterWarehouse(
  rows: unknown[],
  prisma: PrismaClientLike,
  organizationId: string
) {
  for (const raw of rows) {
    const parsed = masterWarehouseRowSchema.parse(raw);
    const core = toWarehouseCore(parsed, organizationId);

    await prisma.warehouse.upsert({
      where: {
        organizationId_code: {
          organizationId: core.organizationId,
          code: core.code
        }
      },
      update: {
        name: core.name,
        address: core.address,
        city: core.city,
        province: core.province,
        isActive: core.isActive
      },
      create: {
        organizationId: core.organizationId,
        code: core.code,
        name: core.name,
        address: core.address,
        city: core.city,
        province: core.province,
        isActive: core.isActive,
        createdBy: core.createdBy
      }
    });
  }
}

/**
 * Contoh ETL Orders.
 */
export async function etlOrders(
  rows: unknown[],
  prisma: PrismaClientLike,
  organizationId: string
) {
  for (const raw of rows) {
    const parsed = ordersRowSchema.parse(raw);
    const core = toOrderCore(parsed as OrdersRow, organizationId, parsed.WarehouseID);

    await prisma.orders.upsert({
      where: {
        organizationId_orderCode: {
          organizationId: core.organizationId,
          orderCode: core.orderCode
        }
      },
      update: {
        warehouseCode: core.warehouseCode,
        status: core.status,
        requestedAt: core.requestedAt,
        notes: core.notes
      },
      create: {
        organizationId: core.organizationId,
        warehouseCode: core.warehouseCode,
        orderCode: core.orderCode,
        status: core.status,
        requestedAt: core.requestedAt,
        notes: core.notes,
        createdBy: core.createdBy
      }
    });
  }
}

// Fungsi-fungsi ETL lain mengikuti pola yang sama untuk:
// - Master_Vendor → vendor
// - Master_Vehicle → vehicle
// - Master_Driver → driver
// - Shipments → shipments + shipment_assignment
// - ScanEvents → scan_event
// - TrackingPing → tracking_ping
// - Audit_Log → audit_log
//
// Untuk menjaga contoh tetap ringkas, implementasi lengkap tidak dituliskan di sini,
// namun pola validasi + mapping + upsert sudah direpresentasikan di fungsi di atas.
