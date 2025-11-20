/**
 * Helper functions untuk konsistensi format angka di dashboard dan KPI cards
 * Testing scenarios:
 * - Format angka besar: 1234567 → 1.234.567
 * - Format angka desimal: 1234.56 → 1.234,56
 * - Format persentase: 98.5 → 98,5%
 * - Handle null/undefined: null → '-'
 */

export function formatNumber(n?: number | null): string {
  if (typeof n !== 'number') return '-';
  return n.toLocaleString('id-ID');
}

export function formatDecimal(n?: number | null, decimals: number = 1): string {
  if (typeof n !== 'number') return '-';
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatPercentage(n?: number | null): string {
  if (typeof n !== 'number') return '-';
  return `${n.toFixed(1)}%`;
}

export function formatDuration(minutes?: number | null): string {
  if (typeof minutes !== 'number') return '-';
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}j ${remainingMinutes}m` : `${hours} jam`;
}

/**
 * Testing scenarios untuk dashboard KPI:
 * 1. Load dashboard dengan mock data
 * 2. Verifikasi semua KPI card menampilkan data dengan format yang benar
 * 3. Test fallback ke mock data saat Supabase error
 * 4. Verifikasi trend indicators (+12%, -5%)
 * 5. Test responsive layout di mobile/desktop
 */

export const testScenarios = {
  dashboard: [
    'Buka dashboard di /dashboard',
    'Verifikasi 4 KPI card menampilkan data',
    'Check format angka: Gate In harus format ribuan',
    'Check format persentase: On-time Delivery harus ada %',
    'Check format waktu: Avg Load harus dalam menit',
    'Verifikasi trend indicators muncul',
    'Test responsive: mobile (< 768px)',
    'Test responsive: tablet (768px - 1024px)',
    'Test responsive: desktop (> 1024px)',
    'Verifikasi fallback ke mock data saat error'
  ],
  tracking: [
    'Test tracking dengan token: DEMO-TRACK-001',
    'Verifikasi timeline event muncul lengkap',
    'Check status shipment: In Transit',
    'Verifikasi customer info: PT Demo Logistik',
    'Test tracking dengan token tidak valid',
    'Verifikasi error handling untuk token salah'
  ],
  modulX: [
    'Buka halaman /modul-x',
    'Verifikasi penjelasan sistem integrasi',
    'Check alur kerja 4 langkah muncul',
    'Test link ke dashboard dari modul-x',
    'Verifikasi konten teknis lengkap'
  ]
};

// duplicate implementations removed; using the typed variants above
