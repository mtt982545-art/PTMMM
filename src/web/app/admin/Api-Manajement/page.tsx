import AppShell from '@/components/layout/app-shell'
import UiPanel from '@/components/ui/ui-panel'
import { getServerUserContext, requireRole } from '@/lib/auth/server-auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminApiManagementPage() {
  const ctx = await getServerUserContext()
  if (!ctx) redirect('/login')
  if (!requireRole(ctx, ['admin'])) redirect('/dashboard')
  return (
    <AppShell>
      <div className="py-8 px-6 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#FFD700' }}>Integrasi MM API (Service Layer)</h1>
          <p className="text-lg" style={{ color: '#b0b7c3' }}>Integrasi eksternal ke MM hanya ada di service layer <code>src/web/lib/services/*</code> dan dijaga oleh env <code>MM_SYNC_ENABLED</code>.</p>
        </div>
        <UiPanel title="Ringkasan">
          <ul className="list-disc pl-6 space-y-2" style={{ color: '#b0b7c3' }}>
            <li>Integrasi MM aktif di: <code>scan-service</code>, <code>gps-service</code>, <code>shipments-service</code>, <code>analytics-service</code>.</li>
            <li>Semua call ke MM lewat <code>mm-sync-service</code> (service layer only).</li>
            <li>Guard <code>MM_SYNC_ENABLED</code> dapat mematikan integrasi tanpa mengubah kode.</li>
            <li>Kontrak API frontend (<code>/api/scan</code>, <code>/api/driver/gps</code>, <code>/api/analytics/overview</code>) tidak berubah.</li>
            <li>DTO dan mapping konsisten dengan schema Prisma/TiDB.</li>
            <li>Typecheck sudah lulus: <code>npm run typecheck</code>.</li>
          </ul>
        </UiPanel>
        <UiPanel title="Cara uji cepat (read-only)">
          <div className="space-y-2" style={{ color: '#b0b7c3' }}>
            <div>Jalankan:</div>
            <pre className="rounded-lg border border-yellow-500/20 p-3 bg-black/30 text-sm" style={{ color: '#ccc' }}><code>npm run typecheck\nnpm run dev</code></pre>
            <div>Buka: <a href="/admin" className="text-yellow-300 underline">/admin</a> dan <a href="/admin/Api-Manajement" className="text-yellow-300 underline">/admin/Api-Manajement</a></div>
          </div>
        </UiPanel>
      </div>
    </AppShell>
  )
}
