import { describe, it, expect } from "vitest";
import {
  masterWarehouseRowSchema,
  ordersRowSchema,
  shipmentsRowSchema,
  scanEventsRowSchema,
  trackingPingRowSchema
} from "../etl/masterSheetSchemas";

describe("masterWarehouseRowSchema", () => {
  it("accepts a valid row", () => {
    const row = {
      WarehouseID: "CII1.14.J.E.1",
      WarehouseName: "Gudang Houseware 1",
      Address: "Jl. Contoh No.1",
      City: "Sidoarjo",
      Province: "Jawa Timur",
      Status: "ACTIVE"
    };

    const parsed = masterWarehouseRowSchema.parse(row);
    expect(parsed.WarehouseID).toBe("CII1.14.J.E.1");
  });
});

describe("ordersRowSchema", () => {
  it("accepts demo order row", () => {
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

    const parsed = ordersRowSchema.parse(row);
    expect(parsed.OrderID).toBe("ORD-2025-0001");
  });
});

describe("shipmentsRowSchema", () => {
  it("accepts demo shipment row", () => {
    const row = {
      ShipmentID: "SHP-2025-0001",
      OrderID: "ORD-2025-0001",
      WarehouseID: "CII1.14.J.E.1",
      VehicleID: "VEH-INT-TRK01",
      DriverID: "DRV-INT-001",
      Status: "in_transit",
      PlannedAt: "2025-01-16T01:00:00Z",
      StartedAt: "2025-01-16T01:10:00Z",
      FinishedAt: ""
    };

    const parsed = shipmentsRowSchema.parse(row);
    expect(parsed.ShipmentID).toBe("SHP-2025-0001");
  });
});

describe("scanEventsRowSchema", () => {
  it("accepts demo scan event row", () => {
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
      Weight: "",
      PayloadJSON: "{}"
    };

    const parsed = scanEventsRowSchema.parse(row);
    expect(parsed.EventID).toBe("EVT-0001");
  });
});

describe("trackingPingRowSchema", () => {
  it("accepts demo tracking ping row", () => {
    const row = {
      PingID: "PING-0001",
      ShipmentID: "SHP-2025-0001",
      DriverID: "DRV-INT-001",
      Lat: -7.3,
      Lng: 112.7,
      Speed: 40,
      Heading: 90,
      TS: "2025-01-16T02:00:00Z"
    };

    const parsed = trackingPingRowSchema.parse(row);
    expect(parsed.PingID).toBe("PING-0001");
  });
});
