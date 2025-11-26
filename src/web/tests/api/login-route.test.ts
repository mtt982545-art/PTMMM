import { describe, it, expect, vi, beforeEach } from 'vitest'

const authMock = { signInWithPassword: vi.fn(), getUser: vi.fn() }

vi.mock('@supabase/auth-helpers-nextjs', () => {
  return { createRouteHandlerClient: () => ({ auth: authMock }) }
})

vi.mock('next/headers', () => {
  const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn(), getAll: vi.fn().mockReturnValue([]) }
  return { cookies: () => store }
})

vi.mock('@/lib/auth/getUserRoles', () => {
  return { getUserRoles: vi.fn() }
})

import { getUserRoles } from '@/lib/auth/getUserRoles'
import { POST } from '@/app/api/login/route'

describe('API /api/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('400 untuk Bad JSON', async () => {
    const req = new Request('http://localhost/api/login', { method: 'POST', body: 'not json', headers: { 'content-type': 'text/plain' } })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Bad JSON')
  })

  it('400 untuk input tidak valid', async () => {
    const body = { email: 'invalid', password: 'short' }
    const req = new Request('http://localhost/api/login', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Invalid input')
  })

  it('401 untuk password salah', async () => {
    ;(authMock.signInWithPassword as any).mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const body = { email: 'user@ptmmm.co', password: 'wrongpass' }
    const req = new Request('http://localhost/api/login', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.ok).toBe(false)
  })

  it('200 untuk login sukses dengan role marketing dan redirect sesuai', async () => {
    ;(authMock.signInWithPassword as any).mockResolvedValue({ error: null })
    ;(getUserRoles as any).mockResolvedValue([{ org_id: 'ORG-1', role: 'marketing' }])
    const body = { email: 'mkt@ptmmm.co', password: 'correctpassword' }
    const req = new Request('http://localhost/api/login', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.role).toBe('marketing')
    expect(json.redirect).toBe('/dashboard/marketing')
  })

  it('200 untuk login sukses tanpa role → redirect no-role', async () => {
    ;(authMock.signInWithPassword as any).mockResolvedValue({ error: null })
    ;(getUserRoles as any).mockResolvedValue([])
    const body = { email: 'user@ptmmm.co', password: 'correctpassword', redirect: '/ops/load' }
    const req = new Request('http://localhost/api/login', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.role).toBeNull()
    expect(json.redirect).toBe('/no-role')
  })
})
