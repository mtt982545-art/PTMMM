import { z } from "zod";

// Helper untuk mengubah "" menjadi undefined
const optionalFromEmpty = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    return val;
  }, schema.optional());

const requiredString = z.preprocess((val) => {
  if (val === null || val === undefined) return val;
  return String(val);
}, z.string().min(1));

const optionalString = optionalFromEmpty(z.string());
const optionalNumber = optionalFromEmpty(z.number());

// Tanggal disimpan sebagai string, tetapi diharapkan ISO-8601.
const optionalDateString = optionalFromEmpty(z.string());

// 1) Master_Warehouse
export const masterWarehouseRowSchema = z.object({
  WarehouseID: requiredString,
  WarehouseName: requiredString,
  Address: optionalString,
  City: optionalString,
  Province: optionalString,
  Status: requiredString
});

// 2) Master_Vendor
export const masterVendorRowSchema = z.object({
  VendorID: requiredString,
  VendorName: requiredString,
  VendorType: requiredString, // diharapkan 'INT' / 'EXT'
  ContactName: optionalString,
  Phone: optionalString,
  Email: optionalString,
  Status: requiredString
});

// 3) Master_Vehicle
export const masterVehicleRowSchema = z.object({
  VehicleID: requiredString,
  VendorID: requiredString,
  ARMADA_CODE: requiredString,
  ARMADA_NAME: requiredString,
  PlateNo: requiredString,
  Capacity: optionalString,
  Notes: optionalString
});

// 4) Master_Driver
export const masterDriverRowSchema = z.object({
  DriverID: requiredString,
  VendorID: requiredString,
  DriverName: requiredString,
  Phone: optionalString,
  LicenseID: optionalString,
  LicenseType: optionalString,
  Status: requiredString
});

// 5) Orders
export const ordersRowSchema = z.object({
  OrderID: requiredString,
  FormCode: optionalString,
  WarehouseID: requiredString,
  VendorID: optionalString,
  VendorType: optionalString,
  RequestedAt: requiredString,
  ETA_Load: optionalString,
  Notes: optionalString
});

// 6) Shipments
export const shipmentsRowSchema = z.object({
  ShipmentID: requiredString,
  OrderID: requiredString,
  WarehouseID: requiredString,
  VehicleID: requiredString,
  DriverID: requiredString,
  Status: requiredString,
  PlannedAt: optionalDateString,
  StartedAt: optionalDateString,
  FinishedAt: optionalDateString
});

// 7) ScanEvents
export const scanEventsRowSchema = z.object({
  EventID: requiredString,
  "Type(gate_in|load_start|load_finish|gate_out)": requiredString,
  FormCode: requiredString,
  ShipmentID: requiredString,
  WarehouseID: requiredString,
  ActorRole: optionalString,
  ActorName: optionalString,
  TS: requiredString,
  Shift: optionalString,
  DockSlot: optionalString,
  PhotoSealURL: optionalString,
  Weight: optionalString,
  PayloadJSON: optionalString // akan dicoba di-parse ke JSON di tahap mapping
});

// 8) TrackingPing
export const trackingPingRowSchema = z.object({
  PingID: requiredString,
  ShipmentID: requiredString,
  DriverID: optionalString,
  Lat: z.preprocess((v) => Number(v), z.number().finite()),
  Lng: z.preprocess((v) => Number(v), z.number().finite()),
  Speed: optionalNumber,
  Heading: optionalNumber,
  TS: requiredString
});

// 9) Audit_Log
export const auditLogRowSchema = z.object({
  AuditID: requiredString,
  Actor: requiredString,
  Role: optionalString,
  Action: requiredString,
  Resource: requiredString,
  ResourceID: requiredString,
  IP: optionalString,
  TS: requiredString,
  MetaJSON: optionalString
});

// 10) Roles
export const rolesRowSchema = z.object({
  "Role Gabungan": requiredString,
  Mencakup: optionalString
});

export type MasterWarehouseRow = z.infer<typeof masterWarehouseRowSchema>;
export type MasterVendorRow = z.infer<typeof masterVendorRowSchema>;
export type MasterVehicleRow = z.infer<typeof masterVehicleRowSchema>;
export type MasterDriverRow = z.infer<typeof masterDriverRowSchema>;
export type OrdersRow = z.infer<typeof ordersRowSchema>;
export type ShipmentsRow = z.infer<typeof shipmentsRowSchema>;
export type ScanEventsRow = z.infer<typeof scanEventsRowSchema>;
export type TrackingPingRow = z.infer<typeof trackingPingRowSchema>;
export type AuditLogRow = z.infer<typeof auditLogRowSchema>;
export type RolesRow = z.infer<typeof rolesRowSchema>;
