// etl_master_sheet_demo.gs
// Contoh Apps Script untuk mengirim data Master Sheet ke endpoint ETL.
// Sesuaikan BASE_URL dan endpoint dengan environment Anda.

const BASE_URL = 'https://your-api-domain.example.com';
const ETL_PATH = '/api/etl/spreadsheet';
const ORG_CODE = 'PTMMM';

/**
 * Membaca data dari sheet dan mengubahnya menjadi array of objects
 * dengan key = header di baris pertama.
 */
function buildRowsFromSheet(sheetName, maxRows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet tidak ditemukan: ' + sheetName);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }

  const headers = values[0];
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const isEmpty = row.every(function (v) {
      return v === '' || v === null;
    });
    if (isEmpty) {
      continue;
    }

    const obj = {};
    headers.forEach(function (header, idx) {
      if (header) {
        obj[String(header)] = row[idx];
      }
    });
    rows.push(obj);

    if (maxRows && rows.length >= maxRows) {
      break;
    }
  }

  return rows;
}

/**
 * Mengirim payload ke endpoint ETL.
 */
function postToEtl(source, sheetName, rows, meta) {
  const url = BASE_URL + ETL_PATH;

  const payload = {
    source: source,
    sheetName: sheetName,
    rows: rows,
    meta: meta || { orgCode: ORG_CODE }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify(payload)
  };

  try {
    const resp = UrlFetchApp.fetch(url, options);
    const code = resp.getResponseCode();
    const body = resp.getContentText();

    Logger.log('POST ' + url + ' [' + code + ']');
    Logger.log(body);

    if (code < 200 || code >= 300) {
      throw new Error('ETL error: HTTP ' + code + ' - ' + body);
    }

    return { code: code, body: body };
  } catch (e) {
    Logger.log('Error calling ETL: ' + e);
    throw e;
  }
}

/**
 * Contoh payload DEMO untuk Orders, identik dengan seed data.
 * Dapat digunakan tanpa membaca sheet (langsung hardcoded).
 */
function buildDemoOrdersRows() {
  return [
    {
      'OrderID': 'ORD-2025-0001',
      'FormCode': 'FORM-ORD-2025-0001',
      'WarehouseID': 'CII1.14.J.E.1',
      'VendorID': 'EXT-CD1',
      'VendorType': 'EXT',
      'RequestedAt': '2025-01-15T08:00:00Z',
      'ETA_Load': '2025-01-16T01:00:00Z',
      'Notes': 'Demo order Moorlife Surabaya'
    },
    {
      'OrderID': 'ORD-2025-0002',
      'FormCode': 'FORM-ORD-2025-0002',
      'WarehouseID': 'CII1.14.J.I.1',
      'VendorID': 'INT-PTMMM',
      'VendorType': 'INT',
      'RequestedAt': '2025-01-15T09:00:00Z',
      'ETA_Load': '2025-01-16T02:00:00Z',
      'Notes': 'Demo order Moorlife Sidoarjo'
    }
  ];
}

/**
 * Contoh payload DEMO untuk Shipments, identik dengan seed data.
 */
function buildDemoShipmentsRows() {
  return [
    {
      'ShipmentID': 'SHP-2025-0001',
      'OrderID': 'ORD-2025-0001',
      'WarehouseID': 'CII1.14.J.E.1',
      'VehicleID': 'VEH-INT-TRK01',
      'DriverID': 'DRV-INT-001',
      'Status': 'in_transit',
      'PlannedAt': '2025-01-16T01:00:00Z',
      'StartedAt': '2025-01-16T01:10:00Z',
      'FinishedAt': ''
    },
    {
      'ShipmentID': 'SHP-2025-0002',
      'OrderID': 'ORD-2025-0002',
      'WarehouseID': 'CII1.14.J.I.1',
      'VehicleID': 'VEH-EXT-CD1-TRK01',
      'DriverID': 'DRV-EXT-CD1-001',
      'Status': 'planned',
      'PlannedAt': '2025-01-16T02:00:00Z',
      'StartedAt': '',
      'FinishedAt': ''
    }
  ];
}

/**
 * Contoh payload DEMO untuk ScanEvents (siklus gate + loading).
 */
function buildDemoScanEventsRows() {
  return [
    {
      'EventID': 'EVT-0001',
      'Type(gate_in|load_start|load_finish|gate_out)': 'gate_in',
      'FormCode': 'FORM-GATE-001',
      'ShipmentID': 'SHP-2025-0001',
      'WarehouseID': 'CII1.14.J.E.1',
      'ActorRole': 'security',
      'ActorName': 'Security A',
      'TS': '2025-01-16T00:30:00Z',
      'Shift': 'Shift 1',
      'DockSlot': '',
      'PhotoSealURL': '',
      'Weight': '',
      'PayloadJSON': '{}'
    },
    {
      'EventID': 'EVT-0002',
      'Type(gate_in|load_start|load_finish|gate_out)': 'load_start',
      'FormCode': 'FORM-LOAD-001',
      'ShipmentID': 'SHP-2025-0001',
      'WarehouseID': 'CII1.14.J.E.1',
      'ActorRole': 'warehouse',
      'ActorName': 'WH A',
      'TS': '2025-01-16T00:40:00Z',
      'Shift': 'Shift 1',
      'DockSlot': 'D1',
      'PhotoSealURL': '',
      'Weight': '',
      'PayloadJSON': '{}'
    },
    {
      'EventID': 'EVT-0003',
      'Type(gate_in|load_start|load_finish|gate_out)': 'load_finish',
      'FormCode': 'FORM-LOAD-001',
      'ShipmentID': 'SHP-2025-0001',
      'WarehouseID': 'CII1.14.J.E.1',
      'ActorRole': 'warehouse',
      'ActorName': 'WH A',
      'TS': '2025-01-16T01:10:00Z',
      'Shift': 'Shift 1',
      'DockSlot': 'D1',
      'PhotoSealURL': 'https://example.com/seal.jpg',
      'Weight': '12345',
      'PayloadJSON': '{"note":"OK"}'
    },
    {
      'EventID': 'EVT-0004',
      'Type(gate_in|load_start|load_finish|gate_out)': 'gate_out',
      'FormCode': 'FORM-GATE-001',
      'ShipmentID': 'SHP-2025-0001',
      'WarehouseID': 'CII1.14.J.E.1',
      'ActorRole': 'security',
      'ActorName': 'Security A',
      'TS': '2025-01-16T01:20:00Z',
      'Shift': 'Shift 1',
      'DockSlot': '',
      'PhotoSealURL': '',
      'Weight': '',
      'PayloadJSON': '{}'
    }
  ];
}

/**
 * Helper demo: kirim batch Orders (data hardcoded).
 */
function sendDemoOrders() {
  const rows = buildDemoOrdersRows();
  return postToEtl('master_sheet_ptmmm', 'Orders', rows, { orgCode: ORG_CODE });
}

/**
 * Helper demo: kirim batch Shipments (data hardcoded).
 */
function sendDemoShipments() {
  const rows = buildDemoShipmentsRows();
  return postToEtl('master_sheet_ptmmm', 'Shipments', rows, { orgCode: ORG_CODE });
}

/**
 * Helper demo: kirim batch ScanEvents (data hardcoded).
 */
function sendDemoScanEvents() {
  const rows = buildDemoScanEventsRows();
  return postToEtl('master_sheet_ptmmm', 'ScanEvents', rows, { orgCode: ORG_CODE });
}

/**
 * Contoh: kirim data dari sheet nyata (bukan demo hardcoded).
 */
function sendOrdersFromSheet() {
  const rows = buildRowsFromSheet('Orders', 200);
  if (!rows.length) {
    Logger.log('Tidak ada data di sheet Orders');
    return;
  }
  return postToEtl('master_sheet_ptmmm', 'Orders', rows, { orgCode: ORG_CODE });
}
