import AppShell from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getServerUserContext, requireRole } from '@/lib/auth/server-auth'
import { prisma } from '@/lib/prisma'
import { listWarehousesForOrganization, createWarehouseForOrganization, updateWarehouseName, setWarehouseActive } from '@/lib/services/multi-warehouse-service'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminWarehousesPage() {
  const user = await getServerUserContext()
  if (!user) redirect('/login')
  if (!requireRole(user, ['admin'])) redirect('/dashboard')

  async function createWarehouse(formData: FormData) {
    'use server'
    const orgId = String(formData.get('orgId') || '')
    const code = String(formData.get('code') || '').trim()
    const name = String(formData.get('name') || '').trim()
    if (!orgId || !code || !name) return
    await createWarehouseForOrganization(orgId, code, name)
  }

  async function updateWarehouse(formData: FormData) {
    'use server'
    const id = String(formData.get('id') || '')
    const name = String(formData.get('name') || '').trim()
    if (!id || !name) return
    await updateWarehouseName(id, name)
  }

  async function toggleWarehouse(formData: FormData) {
    'use server'
    const id = String(formData.get('id') || '')
    const isActive = String(formData.get('isActive') || 'true') === 'true'
    if (!id) return
    await setWarehouseActive(id, isActive)
  }

  const orgs = await prisma.organization.findMany({ orderBy: { name: 'asc' } })
  const whs = await listWarehousesForOrganization(user.orgId)

  return (
    <AppShell>
      <div className="py-8 px-6 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4" style={{ color: '#FFD700' }}>Gudang</h1>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>Buat Gudang</h2>
          <form action={createWarehouse} className="flex flex-wrap gap-3 items-center">
            <select name="orgId" className="ui-input">
              <option value="">Pilih Organisasi</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.code} — {o.name}</option>
              ))}
            </select>
            <Input name="code" placeholder="Kode" />
            <Input name="name" placeholder="Nama" />
            <Button type="submit">Simpan</Button>
          </form>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>Daftar Gudang (Org: {orgs.find((o) => o.id === user.orgId)?.code || user.orgId})</h2>
          <div className="space-y-4">
            {whs.map((w) => (
              <div key={w.id} className="flex items-center gap-4">
                <div className="flex-1" style={{ color: '#b0b7c3' }}>
                  <div className="font-semibold" style={{ color: '#fff' }}>{w.code} — {w.name}</div>
                  <div className="text-xs">Aktif: {w.isActive ? 'Ya' : 'Tidak'}</div>
                </div>
                <form action={updateWarehouse} className="flex gap-2">
                  <input type="hidden" name="id" value={w.id} />
                  <Input name="name" defaultValue={w.name} />
                  <Button type="submit">Update</Button>
                </form>
                <form action={toggleWarehouse} className="flex gap-2">
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="isActive" value={(!w.isActive).toString()} />
                  <Button type="submit">{w.isActive ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                </form>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
