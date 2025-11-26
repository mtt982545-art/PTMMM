# Testing & Quality Checklist

Paket ini menyertakan beberapa lapisan pengujian yang disarankan.

## 1. Unit Test – Validasi Schema Master Sheet

File: `src/tests/masterSheetSchemas.test.ts`

- Menguji bahwa baris contoh dari setiap sheet:
  - Lolos validasi schema Zod yang sesuai.
  - Menolak baris yang:
    - kosong,
    - kolom wajib hilang,
    - format tanggal tidak valid,
    - angka tidak dapat di-parse.

Jalankan:

```bash
npm test
```

## 2. Unit Test – Mapping Master Sheet → DTO Inti

File: `src/tests/masterSheetMapping.test.ts`

- Menguji fungsi mapping di `src/etl/masterSheetMapping.ts`:
  - `toWarehouseCore`
  - `toVendorCore`
  - `toDriverCore`
  - `toVehicleCore`
  - `toOrderCore`
  - `toShipmentCore`
  - `toScanEventCore`
  - `toTrackingPingCore`
  - `toAuditLogCore`

Setiap test memastikan bahwa:

- Kode/ID dari Excel diterjemahkan dengan benar ke field inti (mis. `WarehouseID` → `code`).
- Tanggal string di-convert ke `Date` (atau string ISO) dengan benar.
- Field opsional ditangani dengan aman (null / undefined).

## 3. Integration Test – Endpoint `/api/etl/spreadsheet` (Opsional)

Tidak disediakan penuh dalam paket ini, tetapi pola test yang disarankan:

1. Mock `PrismaClient` (atau layer repository) sehingga insert ke tabel staging tidak benar-benar menyentuh DB produksi.
2. Kirim payload JSON yang sama dengan yang digunakan di Apps Script demo.
3. Verifikasi:
   - Respons HTTP (200 / kode error yang tepat).
   - Fungsi validasi & mapping dipanggil dengan input yang benar.
   - Baris staging (mock) terisi sesuai.

## 4. Manual Test – End-to-end

Setelah deployment ke environment dev/staging:

1. Deploy `01_staging_tables.sql` ke TiDB.
2. Konfigurasi endpoint `/api/etl/spreadsheet` di aplikasi Next.js.
3. Salin & sesuaikan `etl_master_sheet_demo.gs` ke Apps Script, ubah `BASE_URL` ke domain dev/staging.
4. Jalankan fungsi `sendDemoOrders()` dan `sendDemoShipments()` dari Apps Script.
5. Cek di DB (via client / UI):
   - Tabel `stg_orders`, `stg_shipments`, `stg_scan_events` berisi data demo.
   - Tabel inti (`orders`, `shipments`, `scan_event`, dll.) terisi setelah ETL batch dijalankan.
6. Buka dashboard Supabase / frontend dan pastikan data demo muncul di KPI / laporan.

## 5. Performance & Load

Untuk beban data besar:

- Ukur waktu eksekusi Apps Script per batch (Google membatasi runtime per eksekusi).
- Pertimbangkan batch size (mis. 200–500 baris per request).
- Pastikan index pada tabel staging & inti sudah memadai (lihat definisi SQL).

## 6. Regression

Setiap perubahan pada:

- Struktur Master Sheet,
- Staging tables,
- Fungsi mapping,

harus diikuti dengan:

1. Update schema Zod di `masterSheetSchemas.ts`,
2. Update mapping di `masterSheetMapping.ts`,
3. Update test yang relevan,
4. Menjalankan kembali `npm test` sebelum deploy.

Dengan disiplin ini, integrasi tetap stabil dan siap dipakai di lingkungan produksi.
