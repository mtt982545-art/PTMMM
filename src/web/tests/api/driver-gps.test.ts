import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/server-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as any), getServerUserContext: vi.fn() }
})

vi.mock('@/lib/services/gps-service', () => {
  return { createGpsPing: vi.fn().mockResolvedValue({ id: 'PING-1' }) }
})

import { getServerUserContext } from '@/lib/auth/server-auth'
import { POST } from '@/app/api/driver/gps/route'

describe('API /api/driver/gps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GPS_WRITE_TOKEN = 'GPS'
  })

  it('driver + token benar → 200 { ok: true, id }', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] })
    const headers = new Headers({ 'x-gps-token': 'GPS', 'content-type': 'application/json', 'x-forwarded-for': '2.2.2.2' })
    const body = { lat: -6.2, lng: 106.8, speed: 40.5 }
    const req = new Request('http://localhost/api/driver/gps', { method: 'POST', headers, body: JSON.stringify(body) })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(typeof json.id).toBe('string')
  })

  it('token salah → 401', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-DRV', email: 'drv@ptmmm.co', role: 'driver', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['shipments'] })
    const headers = new Headers({ 'x-gps-token': 'WRONG', 'content-type': 'application/json', 'x-forwarded-for': '3.3.3.3' })
    const body = { lat: -6.2, lng: 106.8 }
    const req = new Request('http://localhost/api/driver/gps', { method: 'POST', headers, body: JSON.stringify(body) })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('role bukan driver → 403', async () => {
    ;(getServerUserContext as any).mockResolvedValue({ id: 'UID-OPS', email: 'ops@ptmmm.co', role: 'ops', warehouseIds: [], orgId: 'ORG-1', sectionsAllowed: ['kpi','events','shipments'] })
    const headers = new Headers({ 'x-gps-token': 'GPS', 'content-type': 'application/json', 'x-forwarded-for': '4.4.4.4' })
    const body = { lat: -6.2, lng: 106.8 }
    const req = new Request('http://localhost/api/driver/gps', { method: 'POST', headers, body: JSON.stringify(body) })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })
})
