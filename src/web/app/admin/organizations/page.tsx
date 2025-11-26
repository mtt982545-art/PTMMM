import AppShell from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getServerUserContext, requireRole } from '@/lib/auth/server-auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminOrganizationsPage() {
  const user = await getServerUserContext()
  if (!user) redirect('/login')
  if (!requireRole(user, ['admin'])) redirect('/dashboard')
  const db = prisma as any

  async function createOrganization(formData: FormData) {
    'use server'
    const code = String(formData.get('code') || '').trim()
    const name = String(formData.get('name') || '').trim()
    if (!code || !name) return
    await db.organization.create({ data: { code, name, isActive: true } })
  }

  async function updateOrganization(formData: FormData) {
    'use server'
    const id = String(formData.get('id') || '')
    const name = String(formData.get('name') || '').trim()
    if (!id || !name) return
    await db.organization.update({ where: { id }, data: { name } })
  }

  async function toggleOrganization(formData: FormData) {
    'use server'
    const id = String(formData.get('id') || '')
    const isActive = String(formData.get('isActive') || 'true') === 'true'
    if (!id) return
    await db.organization.update({ where: { id }, data: { isActive } })
  }

  const orgs = await db.organization.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <AppShell>
      <div className="py-8 px-6 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4" style={{ color: '#FFD700' }}>Organisasi</h1>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>Buat Organisasi</h2>
          <form action={createOrganization} className="flex gap-3">
            <Input name="code" placeholder="Kode" />
            <Input name="name" placeholder="Nama" />
            <Button type="submit">Simpan</Button>
          </form>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-white/5 p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#FFD700' }}>Daftar Organisasi</h2>
          <div className="space-y-4">
            {orgs.map((o) => (
              <div key={o.id} className="flex items-center gap-4">
                <div className="flex-1" style={{ color: '#b0b7c3' }}>
                  <div className="font-semibold" style={{ color: '#fff' }}>{o.code} — {o.name}</div>
                  <div className="text-xs">Aktif: {o.isActive ? 'Ya' : 'Tidak'}</div>
                </div>
                <form action={updateOrganization} className="flex gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <Input name="name" defaultValue={o.name} />
                  <Button type="submit">Update</Button>
                </form>
                <form action={toggleOrganization} className="flex gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="isActive" value={(!o.isActive).toString()} />
                  <Button type="submit">{o.isActive ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                </form>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
