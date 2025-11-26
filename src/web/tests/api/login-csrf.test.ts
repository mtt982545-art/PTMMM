import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const authMock = { signInWithPassword: vi.fn(), getUser: vi.fn() }

vi.mock('@supabase/auth-helpers-nextjs', () => {
  return { createRouteHandlerClient: () => ({ auth: authMock }) }
})

vi.mock('next/headers', () => {
  const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn(), getAll: vi.fn().mockReturnValue([]) }
  return { cookies: () => store }
})

vi.mock('@/lib/auth/getUserRoles', () => {
  return { getUserRoles: vi.fn().mockResolvedValue([{ org_id: 'ORG-1', role: 'ops' }]) }
})

import { POST } from '@/app/api/login/route'

describe('API /api/login CSRF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(authMock.signInWithPassword as any).mockResolvedValue({ error: null })
    process.env.ENABLE_CSRF_LOGIN = 'true'
  })

  afterEach(() => {
    delete process.env.ENABLE_CSRF_LOGIN
  })

  it('403 jika CSRF header/cookie tidak ada', async () => {
    const body = { email: 'user@ptmmm.co', password: 'password-ok' }
    const req = new Request('http://localhost/api/login', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Forbidden')
  })

  it('403 jika CSRF header tidak sama dengan cookie', async () => {
    const headers = new Headers({ 'content-type': 'application/json', 'cookie': 'csrf_token=AAA' , 'x-csrf-token': 'BBB' })
    const body = { email: 'user@ptmmm.co', password: 'password-ok' }
    const req = new Request('http://localhost/api/login', { method: 'POST', body: JSON.stringify(body), headers })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.message).toBe('Forbidden')
  })

  it('200 jika CSRF header sama dengan cookie', async () => {
    const headers = new Headers({ 'content-type': 'application/json', 'cookie': 'csrf_token=TOKEN' , 'x-csrf-token': 'TOKEN' })
    const body = { email: 'user@ptmmm.co', password: 'password-ok' }
    const req = new Request('http://localhost/api/login', { method: 'POST', body: JSON.stringify(body), headers })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.role).toBe('ops')
  })
})
