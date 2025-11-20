/**
 * PT.MMM — Apps Script for Supabase Sync, DataMaster Spreadsheet, Reporting — final
 * Kode ini menyatukan: (1) CRUD sinkronisasi ke Supabase via PostgREST,
 * (2) generator Spreadsheet DataMaster lengkap dengan validasi,
 * (3) sinkronisasi laporan harian/mingguan/bulanan, (4) logging & trigger.
 * Harap set Script Properties: SUPABASE_URL, SUPABASE_SERVICE_KEY.
 */

// ============================================================================
// UTILITAS & HELPER
// ============================================================================

// Batching & Throttle konfigurasi
var BATCH_SIZE = 300;   // 200–500 direkomendasikan
var THROTTLE_MS = 200;  // 0 untuk menonaktifkan jeda antar batch

/**
 * Ambil konfigurasi dari Script Properties
 * @returns {Object} {SUPABASE_URL, SERVICE_KEY, POSTGREST}
 */
function getProps_() {
  const p = PropertiesService.getScriptProperties();
  const SUPABASE_URL = p.getProperty('SUPABASE_URL');
  const SERVICE_KEY  = p.getProperty('SUPABASE_SERVICE_KEY');
  const POSTGREST    = p.getProperty('POSTGREST') || (SUPABASE_URL + '/rest/v1');
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return { SUPABASE_URL, SERVICE_KEY, POSTGREST };
}

/**
 * Parse JSON dengan aman
 * @param {string} text - JSON string
 * @returns {Object} Parsed JSON atau object kosong jika error
 */
function safeParseJson_(text) {
  try { return JSON.parse(text || '{}'); } catch (e) { return {}; }
}

/**
 * Log ke sheet khusus dengan header otomatis
 * @param {string} sheetName - Nama sheet log
 * @param {Array} data - Array data untuk ditambahkan
 */
function logToSheet_(sheetName, data) {
  try {
    const ss = SpreadsheetApp.getActive();
    let sh = ss.getSheetByName(sheetName);
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      // Header
      if (sheetName === 'SyncLog') {
        sh.getRange(1,1,1,6).setValues([['Timestamp','Function','Status','Records','Message','Details']]);
      } else if (sheetName === 'ReportLog') {
        sh.getRange(1,1,1,7).setValues([['Timestamp','ReportType','Period','Warehouse','Records','Status','Message']]);
      }
    }
    sh.appendRow(data);
  } catch (e) {
    console.error('logToSheet_ error:', e.toString());
  }
}

/**
 * Util: pastikan sheet ada + header. Tidak menghapus data jika sudah ada.
 */
function ensureSheet_(ss, sheetName, headers) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  } else {
    const existing = sh.getRange(1,1,1,headers.length).getValues()[0];
    // Perbarui header jika berbeda (non-destruktif)
    if (existing.join('\t') !== headers.join('\t')) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
    }
  }
  return sh;
}

/**
 * Util: set format untuk kolom tertentu (date/datetime/number/text/email)
 */
function applyFormats_(sh, formatSpec) {
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  Object.keys(formatSpec).forEach(name => {
    const idx = headers.indexOf(name);
    if (idx < 0) return;
    const type = formatSpec[name];
    const range = sh.getRange(2, idx+1, Math.max(1000, sh.getMaxRows()-1), 1);
    switch (type) {
      case 'date':
        range.setNumberFormat('yyyy-mm-dd');
        break;
      case 'datetime':
        range.setNumberFormat('yyyy-mm-dd hh:mm');
        break;
      case 'number':
        range.setNumberFormat('0');
        break;
      case 'text':
        range.setNumberFormat('@');
        break;
      case 'email':
        // format text + validation email
        range.setNumberFormat('@');
        const dvEmail = SpreadsheetApp.newDataValidation()
          .requireTextIsEmail()
          .setAllowInvalid(false)
          .build();
        range.setDataValidation(dvEmail);
        break;
    }
  });
}

/**
 * Util: set validation VALUE_IN_LIST untuk kolom tertentu
 */
function applyEnumValidation_(sh, enumSpec) {
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  Object.keys(enumSpec).forEach(name => {
    const idx = headers.indexOf(name);
    if (idx < 0) return;
    const values = enumSpec[name];
    const range = sh.getRange(2, idx+1, Math.max(1000, sh.getMaxRows()-1), 1);
    const dv = SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(false)
      .build();
    range.setDataValidation(dv);
  });
}

/**
 * Util: set validation VALUE_IN_RANGE untuk foreign keys (referensi ke sheet lain)
 */
function applyFkValidation_(ss, sh, fkSpec) {
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  Object.keys(fkSpec).forEach(name => {
    const idx = headers.indexOf(name);
    if (idx < 0) return;
    const { sourceSheet, sourceColumnName } = fkSpec[name];
    const src = ss.getSheetByName(sourceSheet);
    if (!src) return;
    const srcHeaders = src.getRange(1,1,1,src.getLastColumn()).getValues()[0];
    const srcIdx = srcHeaders.indexOf(sourceColumnName);
    if (srcIdx < 0) return;
    const srcRange = src.getRange(2, srcIdx+1, Math.max(1000, src.getMaxRows()-1), 1);
    const dv = SpreadsheetApp.newDataValidation()
      .requireValueInRange(srcRange, true)
      .setAllowInvalid(false)
      .build();
    const range = sh.getRange(2, idx+1, Math.max(1000, sh.getMaxRows()-1), 1);
    range.setDataValidation(dv);
  });
}

// Batching helper
function batchArray_(arr, size) {
  var out = [];
  for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Settings helper: ambil KEY–VALUE dari tab Settings
function getSetting_(key) {
  try {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName('Settings');
    if (!sh) return null;
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][0]).trim().toLowerCase() === String(key).trim().toLowerCase()) {
        return vals[i][1] || null;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Generator Spreadsheet DataMaster
 * Membuat/menjamin tab: Org, Warehouse, Vendor, Vehicle, Driver, UserRole, WarehouseMember,
 * Orders, Shipments, ScanEvent, Docs, DailyReport, WeeklyReport, MonthlyReport, SyncLog, ReportLog
 * Sesuai schema Supabase (orders, shipments, scan_event) dan dokumen master.
 */
function createDataMasterSpreadsheet() {
  const ss = SpreadsheetApp.getActive();
  // 1) Master entity
  const shOrg = ensureSheet_(ss, 'Org', ['id','name']);
  const shWh  = ensureSheet_(ss, 'Warehouse', ['id','org_id','name']);
  const shVendor = ensureSheet_(ss, 'Vendor', ['id','org_id','name','vendor_type']);
  const shVeh  = ensureSheet_(ss, 'Vehicle', ['id','warehouse_id','plate','type']);
  const shDriver = ensureSheet_(ss, 'Driver', ['id','warehouse_id','name','phone','email']);
  const shUserRole = ensureSheet_(ss, 'UserRole', ['user_email','org_id','role']);
  const shWhMember = ensureSheet_(ss, 'WarehouseMember', ['user_email','warehouse_id']);

  applyFormats_(shDriver, { email: 'email' });
  applyEnumValidation_(shVendor, { vendor_type: ['internal','external'] });
  applyEnumValidation_(shUserRole, { role: ['admin','marketing','ops','security','driver'] });

  // FK validations
  applyFkValidation_(ss, shWh, { org_id: { sourceSheet: 'Org', sourceColumnName: 'id' } });
  applyFkValidation_(ss, shVendor, { org_id: { sourceSheet: 'Org', sourceColumnName: 'id' } });
  applyFkValidation_(ss, shVeh, { warehouse_id: { sourceSheet: 'Warehouse', sourceColumnName: 'id' } });
  applyFkValidation_(ss, shDriver, { warehouse_id: { sourceSheet: 'Warehouse', sourceColumnName: 'id' } });
  applyFkValidation_(ss, shUserRole, { org_id: { sourceSheet: 'Org', sourceColumnName: 'id' } });
  applyFkValidation_(ss, shWhMember, { warehouse_id: { sourceSheet: 'Warehouse', sourceColumnName: 'id' } });

  // 2) Transactional entity
  const shOrders = ensureSheet_(ss, 'Orders', ['order_id','form_code','warehouse_id','vendor_id','vendor_type','armada_code','muat_code','shift','tgl_muat','sequence','status','created_by']);
  applyFormats_(shOrders, { tgl_muat: 'date', sequence: 'number', created_by: 'email' });
  applyEnumValidation_(shOrders, { vendor_type: ['internal','external'] });
  applyFkValidation_(ss, shOrders, {
    warehouse_id: { sourceSheet: 'Warehouse', sourceColumnName: 'id' },
    vendor_id: { sourceSheet: 'Vendor', sourceColumnName: 'id' }
  });

  const shShipments = ensureSheet_(ss, 'Shipments', ['shipment_id','order_id','warehouse_id','vehicle_id','driver_user_id','status','planned_at']);
  applyFormats_(shShipments, { planned_at: 'datetime', driver_user_id: 'email' });
  applyFkValidation_(ss, shShipments, {
    order_id: { sourceSheet: 'Orders', sourceColumnName: 'order_id' },
    warehouse_id: { sourceSheet: 'Warehouse', sourceColumnName: 'id' },
    vehicle_id: { sourceSheet: 'Vehicle', sourceColumnName: 'id' }
  });

  const shEvents = ensureSheet_(ss, 'ScanEvent', ['form_code','shipment_id','warehouse_id','event_type','ref_type','payload','user_email','created_at']);
  applyFormats_(shEvents, { created_at: 'datetime', user_email: 'email', payload: 'text' });
  applyEnumValidation_(shEvents, { event_type: ['gate_in','gate_out','load_start','load_finish','scan','pod'] });
  applyFkValidation_(ss, shEvents, {
    shipment_id: { sourceSheet: 'Shipments', sourceColumnName: 'shipment_id' },
    warehouse_id: { sourceSheet: 'Warehouse', sourceColumnName: 'id' }
  });

  // 3) Docs sheet
  const shDocs = ensureSheet_(ss, 'Docs', ['Sheet','Column','Type','Description']);
  // bersihkan konten kecuali header
  if (shDocs.getLastRow() > 1) shDocs.getRange(2,1,shDocs.getLastRow()-1,shDocs.getLastColumn()).clear();

  const docs = [
    {sheet:'Org', cols:[
      ['id','uuid','PK organisasi'],
      ['name','text','Nama organisasi']
    ]},
    {sheet:'Warehouse', cols:[
      ['id','uuid','PK gudang'],
      ['org_id','uuid','FK ke Org.id'],
      ['name','text','Nama gudang']
    ]},
    {sheet:'Vendor', cols:[
      ['id','uuid','PK vendor'],
      ['org_id','uuid','FK ke Org.id'],
      ['name','text','Nama vendor'],
      ['vendor_type','enum','internal|external']
    ]},
    {sheet:'Vehicle', cols:[
      ['id','uuid','PK kendaraan'],
      ['warehouse_id','uuid','FK ke Warehouse.id'],
      ['plate','text','Nomor polisi'],
      ['type','text','Tipe kendaraan (CDD/CDE/dll)']
    ]},
    {sheet:'Driver', cols:[
      ['id','uuid','PK driver'],
      ['warehouse_id','uuid','FK ke Warehouse.id'],
      ['name','text','Nama driver'],
      ['phone','text','Nomor telepon'],
      ['email','email','Email driver']
    ]},
    {sheet:'UserRole', cols:[
      ['user_email','email','Email pengguna'],
      ['org_id','uuid','FK ke Org.id'],
      ['role','enum','admin|marketing|ops|security|driver']
    ]},
    {sheet:'WarehouseMember', cols:[
      ['user_email','email','Email pengguna'],
      ['warehouse_id','uuid','FK ke Warehouse.id']
    ]},
    {sheet:'Orders', cols:[
      ['order_id','uuid','PK order'],
      ['form_code','text','Kode form unik'],
      ['warehouse_id','uuid','FK ke Warehouse.id'],
      ['vendor_id','uuid','FK ke Vendor.id'],
      ['vendor_type','enum','internal|external'],
      ['armada_code','text','Kode armada internal'],
      ['muat_code','text','Kode muat'],
      ['shift','text','Shift kerja'],
      ['tgl_muat','date','Tanggal muat'],
      ['sequence','number','Urutan (int)'],
      ['status','text','Status order (default draft)'],
      ['created_by','email','Pembuat']
    ]},
    {sheet:'Shipments', cols:[
      ['shipment_id','uuid','PK pengiriman'],
      ['order_id','uuid','FK ke Orders.order_id'],
      ['warehouse_id','uuid','FK ke Warehouse.id'],
      ['vehicle_id','uuid','FK ke Vehicle.id'],
      ['driver_user_id','email','Email driver'],
      ['status','text','Status shipment (default scheduled)'],
      ['planned_at','datetime','Waktu rencana keberangkatan']
    ]},
    {sheet:'ScanEvent', cols:[
      ['form_code','text','Relasi ke Orders.form_code'],
      ['shipment_id','uuid','FK ke Shipments.shipment_id'],
      ['warehouse_id','uuid','FK ke Warehouse.id'],
      ['event_type','enum','gate_in|gate_out|load_start|load_finish|scan|pod'],
      ['ref_type','text','Jenis referensi (gate/load/...)'],
      ['payload','json','Payload tambahan'],
      ['user_email','email','Aktor'],
      ['created_at','datetime','Waktu event']
    ]}
  ];
  const rows = [];
  docs.forEach(d => d.cols.forEach(c => rows.push([d.sheet, c[0], c[1], c[2]])));
  if (rows.length) shDocs.getRange(2,1,rows.length,4).setValues(rows);

  // 4) Report sheets
  ensureSheet_(ss, 'DailyReport', ['Date','Warehouse','Gate In','Gate Out','Load Start','Load Finish','Scans','Avg Load Dur (min)','Forms','Shipments','Last Event','Generated At','Status','Warehouse ID']);
  ensureSheet_(ss, 'WeeklyReport', ['Week Start','Week End','Warehouse','Gate In','Gate Out','Load Start','Load Finish','Scans','Avg Daily Gate In','Avg Daily Load Finish','Avg Load Dur (min)','Weekly SLA (%)','Forms','Shipments','Last Event','Generated At','Status']);
  ensureSheet_(ss, 'MonthlyReport', ['Month Start','Month End','Warehouse','Gate In','Gate Out','Load Start','Load Finish','Scans','Avg Load Dur (min)','Monthly SLA (%)','Forms','Shipments','Load Completion Rate (%)','Last Event','Generated At','Status']);

  // 5) Log sheets
  ensureSheet_(ss, 'SyncLog', ['Timestamp','Function','Status','Records','Message','Details']);
  ensureSheet_(ss, 'ReportLog', ['Timestamp','ReportType','Period','Warehouse','Records','Status','Message']);

  logToSheet_('SyncLog', [new Date(), 'createDataMasterSpreadsheet', 'success', rows.length, 'DataMaster ready', '']);
  return { sheetsCreated: ['Org','Warehouse','Vendor','Vehicle','Driver','UserRole','WarehouseMember','Orders','Shipments','ScanEvent','Docs','DailyReport','WeeklyReport','MonthlyReport','SyncLog','ReportLog'] };
}

function upsertTable_(tableName, rows, conflictKeys) {
  if (!rows || !rows.length) return [];
  const { SERVICE_KEY, POSTGREST } = getProps_();
  const url = POSTGREST + '/' + tableName + '?on_conflict=' + encodeURIComponent(conflictKeys.join(','));
  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
      Prefer: 'resolution=merge-duplicates'
    },
    payload: JSON.stringify(rows),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code >= 300) throw new Error('Upsert ' + tableName + ' failed: ' + code + ' ' + resp.getContentText());
  return JSON.parse(resp.getContentText() || '[]');
}

// === Sync Order sheet → public.orders ===
function buildOrdersPayload_(sh) {
  const [header, ...rows] = sh.getDataRange().getValues();
  const H = new Map(header.map((h,i)=>[String(h).trim().toLowerCase(), i]));
  const get = (row, name) => {
    const key = String(name).trim().toLowerCase();
    const alt = key.replace(/_/g,'');
    return row[ H.get(key) ] ?? row[ H.get(alt) ];
  };
  const defWh = getSetting_('DEFAULT_WH_ID');
  return rows.filter(r => !!get(r,'form_code')).map(r => ({
    form_code: get(r,'form_code'),
    warehouse_id: get(r,'warehouse_id') || defWh || null,
    vendor_id: get(r,'vendor_id') || null,
    vendor_type: get(r,'vendor_type') || null,
    armada_code: get(r,'armada_code') || null,
    muat_code: get(r,'muat_code') || null,
    shift: get(r,'shift') || null,
    tgl_muat: get(r,'tgl_muat') || null,
    sequence: get(r,'sequence') || null,
    status: get(r,'status') || 'draft',
    created_by: Session.getActiveUser().getEmail() || null
  }));
}

function syncOrderSheetToSupabase() {
  var summary = { totalRows: 0, processed: 0, inserted: 0, updated: 0, skipped: 0, invalid: 0, batches: 0 };
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName('Orders') || ss.getSheetByName('Order');
    if (!sh) throw new Error('Sheet "Orders/Order" not found');
    const data = buildOrdersPayload_(sh);
    summary.totalRows = data.length;
    const chunks = batchArray_(data, BATCH_SIZE);
    summary.batches = chunks.length;
    for (var c = 0; c < chunks.length; c++) {
      try {
        const res = upsertTable_('orders', chunks[c], ['form_code']);
        summary.processed += chunks[c].length;
        summary.inserted += res.length;
        logToSheet_('SyncLog', [new Date(), 'syncOrderSheetToSupabase', 'success', res.length, 'Batch ' + (c+1) + '/' + chunks.length, 'size=' + chunks[c].length]);
      } catch (e) {
        summary.skipped += chunks[c].length;
        logToSheet_('SyncLog', [new Date(), 'syncOrderSheetToSupabase', 'error', 0, 'Batch ' + (c+1) + ' failed', String(e)]);
      }
      if (THROTTLE_MS) Utilities.sleep(THROTTLE_MS);
    }
  } catch (err) {
    logToSheet_('SyncLog', [new Date(), 'syncOrderSheetToSupabase', 'error', 0, 'Sync failed', String(err)]);
    throw err;
  }
  logToSheet_('SyncLog', [new Date(), 'syncOrderSheetToSupabase', 'summary', summary.processed, 'done', JSON.stringify(summary)]);
  return summary;
}

// === Sync Shipment sheet → public.shipments ===
function buildShipmentsPayload_(sh) {
  const [h, ...rows] = sh.getDataRange().getValues();
  const M = new Map(h.map((x,i)=>[String(x).trim().toLowerCase(), i]));
  const G = (row, name) => {
    const key = String(name).trim().toLowerCase();
    const alt = key.replace(/_/g,'');
    return row[ M.get(key) ] ?? row[ M.get(alt) ];
  };
  return rows.filter(r => (G(r,'shipment_id')))
    .map(r => ({
      shipment_id: G(r,'shipment_id') || null,
      order_id: G(r,'order_id') || null,
      warehouse_id: G(r,'warehouse_id') || null,
      driver_user_id: G(r,'driver_user_id') || null,
      vehicle_id: G(r,'vehicle_id') || null,
      status: G(r,'status') || 'scheduled',
      planned_at: G(r,'planned_at') || null
    }));
}

function syncShipmentSheetToSupabase() {
  var summary = { totalRows: 0, processed: 0, inserted: 0, updated: 0, skipped: 0, invalid: 0, batches: 0 };
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName('Shipments') || ss.getSheetByName('Shipment');
    if (!sh) throw new Error('Sheet "Shipments/Shipment" not found');
    const data = buildShipmentsPayload_(sh);
    summary.totalRows = data.length;
    const chunks = batchArray_(data, BATCH_SIZE);
    summary.batches = chunks.length;
    for (var c = 0; c < chunks.length; c++) {
      try {
        const res = upsertTable_('shipments', chunks[c], ['shipment_id']);
        summary.processed += chunks[c].length;
        summary.inserted += res.length;
        logToSheet_('SyncLog', [new Date(), 'syncShipmentSheetToSupabase', 'success', res.length, 'Batch ' + (c+1) + '/' + chunks.length, 'size=' + chunks[c].length]);
      } catch (e) {
        summary.skipped += chunks[c].length;
        logToSheet_('SyncLog', [new Date(), 'syncShipmentSheetToSupabase', 'error', 0, 'Batch ' + (c+1) + ' failed', String(e)]);
      }
      if (THROTTLE_MS) Utilities.sleep(THROTTLE_MS);
    }
  } catch (err) {
    logToSheet_('SyncLog', [new Date(), 'syncShipmentSheetToSupabase', 'error', 0, 'Sync failed', String(err)]);
    throw err;
  }
  logToSheet_('SyncLog', [new Date(), 'syncShipmentSheetToSupabase', 'summary', summary.processed, 'done', JSON.stringify(summary)]);
  return summary;
}

// === Sync Events sheet → public.scan_event ===
function buildEventsPayload_(sh) {
  const [h, ...rows] = sh.getDataRange().getValues();
  const M = new Map(h.map((x,i)=>[String(x).trim().toLowerCase(), i]));
  const G = (row, name) => {
    const key = String(name).trim().toLowerCase();
    const alt = key.replace(/_/g,'');
    return row[ M.get(key) ] ?? row[ M.get(alt) ];
  };
  const allowed = ['gate_in','gate_out','load_start','load_finish','scan','pod'];
  var invalidCount = 0;
  var list = rows.map(r => {
    const et = String(G(r,'event_type') || '').trim().toLowerCase();
    const payloadRaw = G(r,'payload') || G(r,'payloadjson');
    const payload = (function(){ try { return payloadRaw ? JSON.parse(payloadRaw) : {}; } catch(e){ return {}; }})();
    return {
      form_code: G(r,'form_code'),
      shipment_id: G(r,'shipment_id') || null,
      warehouse_id: G(r,'warehouse_id') || null,
      event_type: et,
      ref_type: G(r,'ref_type') || null,
      payload: payload,
      user_email: G(r,'user_email') || null,
      ts: G(r,'created_at') || null
    };
  });
  const filtered = list.filter(r => {
    const ok = !!r.form_code && allowed.includes(r.event_type);
    if (!ok) invalidCount++;
    return ok;
  });
  return { filtered, invalidCount };
}

function syncEventsToSupabase() {
  var summary = { totalRows: 0, processed: 0, inserted: 0, updated: 0, skipped: 0, invalid: 0, batches: 0 };
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName('ScanEvent') || ss.getSheetByName('Events');
    if (!sh) throw new Error('Sheet "ScanEvent/Events" not found');
    const built = buildEventsPayload_(sh);
    summary.totalRows = built.filtered.length + built.invalidCount;
    summary.invalid = built.invalidCount;
    const chunks = batchArray_(built.filtered, BATCH_SIZE);
    summary.batches = chunks.length;
    for (var c = 0; c < chunks.length; c++) {
      try {
        const res = upsertTable_('scan_event', chunks[c], ['form_code','event_type']);
        summary.processed += chunks[c].length;
        summary.inserted += res.length;
        logToSheet_('SyncLog', [new Date(), 'syncEventsToSupabase', 'success', res.length, 'Batch ' + (c+1) + '/' + chunks.length, 'size=' + chunks[c].length]);
      } catch (e) {
        summary.skipped += chunks[c].length;
        logToSheet_('SyncLog', [new Date(), 'syncEventsToSupabase', 'error', 0, 'Batch ' + (c+1) + ' failed', String(e)]);
      }
      if (THROTTLE_MS) Utilities.sleep(THROTTLE_MS);
    }
  } catch (err) {
    logToSheet_('SyncLog', [new Date(), 'syncEventsToSupabase', 'error', 0, 'Sync failed', String(err)]);
    throw err;
  }
  logToSheet_('SyncLog', [new Date(), 'syncEventsToSupabase', 'summary', summary.processed, 'done', JSON.stringify(summary)]);
  return summary;
}

// === Reporting Functions ===
function fetchFromSupabase_(endpoint) {
  const { SERVICE_KEY, POSTGREST } = getProps_();
  const url = POSTGREST + endpoint;
  const resp = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY
    },
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code >= 300) throw new Error('Fetch failed: ' + code + ' ' + resp.getContentText());
  return JSON.parse(resp.getContentText() || '[]');
}

function syncDailyReportToSheet() {
  try {
    const data = fetchFromSupabase_('/rpc/rpc_get_daily_report');
    const ss = SpreadsheetApp.getActive();
    let sh = ss.getSheetByName('DailyReport');
    if (!sh) {
      sh = ss.insertSheet('DailyReport');
      sh.getRange(1,1,1,14).setValues([[
        'Date','Warehouse','Gate In','Gate Out','Load Start','Load Finish','Scans',
        'Avg Load Dur (min)','Forms','Shipments','Last Event','Generated At','Status','Warehouse ID'
      ]]);
    }
    
    // Clear existing data (keep headers)
    if (sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clear();
    }
    
    // Insert new data
    if (data.length > 0) {
      const rows = data.map(r => [
        r.report_date,
        r.warehouse_name,
        r.total_gate_in,
        r.total_gate_out,
        r.total_load_start,
        r.total_load_finish,
        r.total_scans,
        r.avg_load_duration_minutes,
        r.total_forms,
        r.total_shipments,
        r.last_event_time,
        r.report_generated_at,
        'synced',
        r.warehouse_id
      ]);
      sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    logToSheet_('ReportLog', [new Date(), 'daily', new Date().toISOString().split('T')[0], 'all', data.length, 'success', 'Daily report synced']);
    return data.length;
  } catch (e) {
    logToSheet_('ReportLog', [new Date(), 'daily', new Date().toISOString().split('T')[0], 'all', 0, 'error', e.toString()]);
    throw e;
  }
}

function syncWeeklyReportToSheet() {
  try {
    const data = fetchFromSupabase_('/rpc/rpc_get_weekly_report');
    const ss = SpreadsheetApp.getActive();
    let sh = ss.getSheetByName('WeeklyReport');
    if (!sh) {
      sh = ss.insertSheet('WeeklyReport');
      sh.getRange(1,1,1,17).setValues([[
        'Week Start','Week End','Warehouse','Gate In','Gate Out','Load Start','Load Finish','Scans',
        'Avg Daily Gate In','Avg Daily Load Finish','Avg Load Dur (min)','Weekly SLA (%)',
        'Forms','Shipments','Last Event','Generated At','Status'
      ]]);
    }
    
    // Clear existing data (keep headers)
    if (sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clear();
    }
    
    // Insert new data
    if (data.length > 0) {
      const rows = data.map(r => [
        r.week_start,
        r.week_end,
        r.warehouse_name,
        r.weekly_gate_in,
        r.weekly_gate_out,
        r.weekly_load_start,
        r.weekly_load_finish,
        r.weekly_scans,
        r.avg_daily_gate_in,
        r.avg_daily_load_finish,
        r.avg_load_duration_minutes,
        r.weekly_sla_percentage,
        r.weekly_forms,
        r.weekly_shipments,
        r.last_event_time,
        r.report_generated_at,
        'synced'
      ]);
      sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    logToSheet_('ReportLog', [new Date(), 'weekly', data[0]?.week_start + ' to ' + data[0]?.week_end, 'all', data.length, 'success', 'Weekly report synced']);
    return data.length;
  } catch (e) {
    logToSheet_('ReportLog', [new Date(), 'weekly', new Date().toISOString().split('T')[0], 'all', 0, 'error', e.toString()]);
    throw e;
  }
}

function syncMonthlyReportToSheet() {
  try {
    const data = fetchFromSupabase_('/rpc/rpc_get_monthly_report');
    const ss = SpreadsheetApp.getActive();
    let sh = ss.getSheetByName('MonthlyReport');
    if (!sh) {
      sh = ss.insertSheet('MonthlyReport');
      sh.getRange(1,1,1,16).setValues([[
        'Month Start','Month End','Warehouse','Gate In','Gate Out','Load Start','Load Finish','Scans',
        'Avg Load Dur (min)','Monthly SLA (%)','Forms','Shipments','Load Completion Rate (%)','Last Event','Generated At','Status'
      ]]);
    }
    
    // Clear existing data (keep headers)
    if (sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clear();
    }
    
    // Insert new data
    if (data.length > 0) {
      const rows = data.map(r => [
        r.month_start,
        r.month_end,
        r.warehouse_name,
        r.monthly_gate_in,
        r.monthly_gate_out,
        r.monthly_load_start,
        r.monthly_load_finish,
        r.monthly_scans,
        r.avg_load_duration_minutes,
        r.monthly_sla_percentage,
        r.monthly_forms,
        r.monthly_shipments,
        r.load_completion_rate,
        r.last_event_time,
        r.report_generated_at,
        'synced'
      ]);
      sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    logToSheet_('ReportLog', [new Date(), 'monthly', data[0]?.year + '-' + data[0]?.month, 'all', data.length, 'success', 'Monthly report synced']);
    return data.length;
  } catch (e) {
    logToSheet_('ReportLog', [new Date(), 'monthly', new Date().toISOString().split('T')[0], 'all', 0, 'error', e.toString()]);
    throw e;
  }
}

function createBackup_() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ss = SpreadsheetApp.getActive();
    const backupName = 'Backup_' + timestamp;
    
    // Create backup sheets
    const sheets = ['DailyReport', 'WeeklyReport', 'MonthlyReport'];
    let totalRecords = 0;
    
    sheets.forEach(sheetName => {
      const source = ss.getSheetByName(sheetName);
      if (source) {
        const backup = source.copyTo(ss);
        backup.setName(sheetName + '_Backup_' + timestamp);
        totalRecords += source.getLastRow() - 1;
      }
    });
    
    logToSheet_('SyncLog', [new Date(), 'backup', 'success', totalRecords, 'Backup created', backupName]);
    return { backupName, totalRecords };
  } catch (e) {
    logToSheet_('SyncLog', [new Date(), 'backup', 'error', 0, 'Backup failed', e.toString()]);
    throw e;
  }
}

/**
 * Konfigurasi trigger: hapus duplikat, buat waktu-berbasis untuk cronSyncAll & cronSyncReports
 */
function setupTriggers() {
  const targets = ['cronSyncAll','cronSyncReports'];
  const triggers = ScriptApp.getProjectTriggers();
  // Hapus duplikat
  triggers.forEach(t => {
    const fn = t.getHandlerFunction();
    if (targets.includes(fn)) ScriptApp.deleteTrigger(t);
  });
  // Buat ulang
  ScriptApp.newTrigger('cronSyncAll').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('cronSyncReports').timeBased().everyHours(6).create();
  logToSheet_('SyncLog', [new Date(), 'setupTriggers', 'success', 2, 'Triggers set', '15m & 6h']);
}

// === Enhanced Orchestrator ===
function cronSyncAll() {
  var report = {};
  try {
    try { report.orders = syncOrderSheetToSupabase(); } catch (e) { logToSheet_('SyncLog', [new Date(), 'cronSyncAll', 'error', 0, 'Orders sync failed', String(e)]); }
    try { report.shipments = syncShipmentSheetToSupabase(); } catch (e) { logToSheet_('SyncLog', [new Date(), 'cronSyncAll', 'error', 0, 'Shipments sync failed', String(e)]); }
    try { report.events = syncEventsToSupabase(); } catch (e) { logToSheet_('SyncLog', [new Date(), 'cronSyncAll', 'error', 0, 'Events sync failed', String(e)]); }
    const total = (report.orders?.processed||0) + (report.shipments?.processed||0) + (report.events?.processed||0);
    logToSheet_('SyncLog', [new Date(), 'cronSyncAll', 'success', total, 'All syncs completed', JSON.stringify(report)]);
    return report;
  } catch (e) {
    logToSheet_('SyncLog', [new Date(), 'cronSyncAll', 'error', 0, 'cron failed', String(e)]);
    throw e;
  }
}

function cronSyncReports() {
  try {
    const daily = syncDailyReportToSheet();
    const weekly = syncWeeklyReportToSheet();
    const monthly = syncMonthlyReportToSheet();
    const backup = createBackup_();
    logToSheet_('SyncLog', [new Date(), 'reports', 'success', daily + weekly + monthly, 'All reports synced', 'backup:' + backup.backupName]);
    return { daily, weekly, monthly, backup };
  } catch (e) {
    logToSheet_('SyncLog', [new Date(), 'reports', 'error', 0, 'Reports sync failed', String(e)]);
    throw e;
  }
}