import { describe, it, expect } from "vitest";
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
} from "../etl/masterSheetMapping";

describe("mapping functions", () => {
  const orgId = "org-demo-ptmmm";

  it("maps warehouse row to core DTO", () => {
    const row = {
      WarehouseID: "CII1.14.J.E.1",
      WarehouseName: "Gudang Houseware 1",
      Address: "Jl. Contoh No.1",
      City: "Sidoarjo",
      Province: "Jawa Timur",
      Status: "ACTIVE"
    };

    const core = toWarehouseCore(row as any, orgId);
    expect(core.organizationId).toBe(orgId);
    expect(core.code).toBe("CII1.14.J.E.1");
    expect(core.isActive).toBe(true);
  });

  it("maps orders row to core DTO", () => {
    const row = {
      OrderID: "ORD-2025-0001",
      FormCode: "FORM-ORD-2025-0001",
      WarehouseID: "CII1.14.J.E.1",
      VendorID: "EXT-CD1",
      VendorType: "EXT",
      RequestedAt: "2025-01-15T08:00:00Z",
      ETA_Load: "2025-01-16T01:00:00Z",
      Notes: "Demo order Moorlife Surabaya"
    };

    const core = toOrderCore(row as any, orgId, row.WarehouseID);
    expect(core.orderCode).toBe("ORD-2025-0001");
    expect(core.warehouseCode).toBe("CII1.14.J.E.1");
  });

  it("maps scan event row to core DTO", () => {
    const row = {
      EventID: "EVT-0001",
      "Type(gate_in|load_start|load_finish|gate_out)": "gate_in",
      FormCode: "FORM-GATE-001",
      ShipmentID: "SHP-2025-0001",
      WarehouseID: "CII1.14.J.E.1",
      ActorRole: "security",
      ActorName: "Security A",
      TS: "2025-01-16T00:30:00Z",
      Shift: "Shift 1",
      DockSlot: "",
      PhotoSealURL: "",
      Weight: "12345",
      PayloadJSON: "{\"note\":\"OK\"}"
    };

    const core = toScanEventCore(row as any, orgId);
    expect(core.organizationId).toBe(orgId);
    expect(core.shipmentCode).toBe("SHP-2025-0001");
    expect(core.payload.weight).toBe(12345);
  });

  it("maps audit log row to core DTO", () => {
    const row = {
      AuditID: "AUD-0001",
      Actor: "ops@ptmmm.local",
      Role: "ops",
      Action: "CREATE",
      Resource: "shipment",
      ResourceID: "SHP-2025-0001",
      IP: "127.0.0.1",
      TS: "2025-01-15T23:55:00Z",
      MetaJSON: "{\"source\":\"seed\"}"
    };

    const core = toAuditLogCore(row as any, orgId);
    expect(core.userEmail).toBe("ops@ptmmm.local");
    expect(core.entity).toBe("shipment");
    expect(core.details?.source).toBe("seed");
  });
});
