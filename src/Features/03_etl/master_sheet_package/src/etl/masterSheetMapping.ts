import {
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

/**
 * DTO inti untuk insert ke tabel utama (di-handle Prisma).
 * Di sini hanya didefinisikan tipe minimal agar mapping jelas.
 */

export interface WarehouseCore {
  organizationId: string;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  isActive: boolean;
  createdBy: string;
}

export interface VendorCore {
  organizationId: string;
  code: string;
  name: string;
  vendorType: "INT" | "EXT";
  isActive: boolean;
  createdBy: string;
}

export interface VehicleCore {
  organizationId: string;
  vendorCode: string;
  vehicleCode: string;
  plateNumber: string;
  vehicleType?: string | null;
  meta?: Record<string, unknown>;
  createdBy: string;
}

export interface DriverCore {
  organizationId: string;
  vendorCode: string;
  driverCode: string;
  name: string;
  phone?: string | null;
  licenseId?: string | null;
  licenseType?: string | null;
  status: string;
  createdBy: string;
}

export interface OrderCore {
  organizationId: string;
  warehouseCode: string;
  orderCode: string;
  customer: string | null;
  origin: string | null;
  destination: string | null;
  status: string;
  requestedAt: string; // ISO string
  notes?: string | null;
  createdBy: string;
}

export interface ShipmentCore {
  organizationId: string;
  warehouseCode: string;
  orderCode: string;
  shipmentCode: string;
  status: string;
  plannedDepartureTime?: string | null;
  actualDepartureTime?: string | null;
  actualArrivalTime?: string | null;
  vehicleCode: string;
  driverCode: string;
  createdBy: string;
}

export interface ScanEventCore {
  organizationId: string;
  warehouseCode: string;
  shipmentCode: string;
  eventType: string;
  formCode: string;
  ts: string;
  userEmail?: string | null;
  payload: Record<string, unknown>;
  createdBy: string;
}

export interface TrackingPingCore {
  organizationId: string;
  shipmentCode: string;
  driverCode?: string | null;
  lat: number;
  lng: number;
  speedKph?: number | null;
  headingDeg?: number | null;
  ts: string;
  createdBy: string;
}

export interface AuditLogCore {
  organizationId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string;
  ts: string;
  details?: Record<string, unknown>;
  createdBy: string;
}

function normalizeStatus(status: string): string {
  const value = status.trim().toLowerCase();
  if (["active", "aktif"].includes(value)) return "ACTIVE";
  if (["inactive", "nonaktif", "non-active"].includes(value)) return "INACTIVE";
  return status;
}

function toIsoStringOrNull(input?: string | null): string | null {
  if (!input) return null;
  // Asumsi input sudah berupa ISO atau `yyyy-mm-dd hh:mm:ss`. Langsung diteruskan.
  return input;
}

// --- Mapping Master Data ---

export function toWarehouseCore(row: MasterWarehouseRow, organizationId: string, createdBy = "etl-master-sheet"): WarehouseCore {
  return {
    organizationId,
    code: row.WarehouseID,
    name: row.WarehouseName,
    address: row.Address || null,
    city: row.City || null,
    province: row.Province || null,
    isActive: normalizeStatus(row.Status) === "ACTIVE",
    createdBy
  };
}

export function toVendorCore(row: MasterVendorRow, organizationId: string, createdBy = "etl-master-sheet"): VendorCore {
  const vt = row.VendorType.toUpperCase() === "EXT" ? "EXT" : "INT";
  return {
    organizationId,
    code: row.VendorID,
    name: row.VendorName,
    vendorType: vt,
    isActive: normalizeStatus(row.Status) === "ACTIVE",
    createdBy
  };
}

export function toVehicleCore(row: MasterVehicleRow, organizationId: string, createdBy = "etl-master-sheet"): VehicleCore {
  const meta: Record<string, unknown> = {};
  if (row.ARMADA_NAME) meta.name = row.ARMADA_NAME;
  if (row.Capacity) meta.capacity = row.Capacity;
  if (row.Notes) meta.notes = row.Notes;

  return {
    organizationId,
    vendorCode: row.VendorID,
    vehicleCode: row.VehicleID,
    plateNumber: row.PlateNo,
    vehicleType: row.ARMADA_CODE || null,
    meta: Object.keys(meta).length ? meta : undefined,
    createdBy
  };
}

export function toDriverCore(row: MasterDriverRow, organizationId: string, createdBy = "etl-master-sheet"): DriverCore {
  return {
    organizationId,
    vendorCode: row.VendorID,
    driverCode: row.DriverID,
    name: row.DriverName,
    phone: row.Phone || null,
    licenseId: row.LicenseID || null,
    licenseType: row.LicenseType || null,
    status: normalizeStatus(row.Status),
    createdBy
  };
}

// --- Mapping Orders & Shipments ---

export function toOrderCore(row: OrdersRow, organizationId: string, warehouseCode: string, createdBy = "etl-master-sheet"): OrderCore {
  return {
    organizationId,
    warehouseCode,
    orderCode: row.OrderID,
    customer: null,
    origin: warehouseCode,
    destination: null,
    status: "planned",
    requestedAt: row.RequestedAt,
    notes: row.Notes || null,
    createdBy
  };
}

export function toShipmentCore(row: ShipmentsRow, organizationId: string, createdBy = "etl-master-sheet"): ShipmentCore {
  return {
    organizationId,
    warehouseCode: row.WarehouseID,
    orderCode: row.OrderID,
    shipmentCode: row.ShipmentID,
    status: row.Status,
    plannedDepartureTime: toIsoStringOrNull(row.PlannedAt),
    actualDepartureTime: toIsoStringOrNull(row.StartedAt),
    actualArrivalTime: toIsoStringOrNull(row.FinishedAt),
    vehicleCode: row.VehicleID,
    driverCode: row.DriverID,
    createdBy
  };
}

// --- Mapping ScanEvents, TrackingPing, AuditLog ---

export function toScanEventCore(row: ScanEventsRow, organizationId: string, createdBy = "etl-master-sheet"): ScanEventCore {
  let payload: Record<string, unknown> = {};

  if (row.PayloadJSON) {
    try {
      payload = JSON.parse(row.PayloadJSON);
    } catch {
      payload = { rawPayloadJSON: row.PayloadJSON };
    }
  }

  if (row.ActorRole) payload.actorRole = row.ActorRole;
  if (row.ActorName) payload.actorName = row.ActorName;
  if (row.Shift) payload.shift = row.Shift;
  if (row.DockSlot) payload.dockSlot = row.DockSlot;
  if (row.PhotoSealURL) payload.photoSealUrl = row.PhotoSealURL;
  if (row.Weight) {
    const n = Number(row.Weight);
    payload.weight = Number.isFinite(n) ? n : row.Weight;
  }

  return {
    organizationId,
    warehouseCode: row.WarehouseID,
    shipmentCode: row.ShipmentID,
    eventType: row["Type(gate_in|load_start|load_finish|gate_out)"],
    formCode: row.FormCode,
    ts: row.TS,
    userEmail: undefined,
    payload,
    createdBy
  };
}

export function toTrackingPingCore(row: TrackingPingRow, organizationId: string, createdBy = "etl-master-sheet"): TrackingPingCore {
  return {
    organizationId,
    shipmentCode: row.ShipmentID,
    driverCode: row.DriverID || null,
    lat: row.Lat,
    lng: row.Lng,
    speedKph: row.Speed ?? null,
    headingDeg: row.Heading ?? null,
    ts: row.TS,
    createdBy
  };
}

export function toAuditLogCore(row: AuditLogRow, organizationId: string, createdBy = "etl-master-sheet"): AuditLogCore {
  let details: Record<string, unknown> = {};

  if (row.MetaJSON) {
    try {
      details = JSON.parse(row.MetaJSON);
    } catch {
      details = { rawMetaJSON: row.MetaJSON };
    }
  }

  if (row.Role) details.role = row.Role;
  if (row.IP) details.ip = row.IP;

  return {
    organizationId,
    userEmail: row.Actor,
    action: row.Action,
    entity: row.Resource,
    entityId: row.ResourceID,
    ts: row.TS,
    details,
    createdBy
  };
}
