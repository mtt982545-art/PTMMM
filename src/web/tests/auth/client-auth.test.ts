import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@supabase/auth-helpers-nextjs', () => {
  const auth = { signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), getUser: vi.fn() }
  const client = { auth }
  return { createClientComponentClient: vi.fn(() => client) }
})

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { loginWithPassword } from '@/lib/auth/client-auth'

describe('client-auth.loginWithPassword', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengembalikan success dan role dari /api/login', async () => {
    ;(createClientComponentClient() as any).auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'UID-OPS', email: 'ops@ptmmm.co' } }, error: null })
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true, role: 'ops', redirect: '/ops/load' }) }) as any
    const res = await loginWithPassword('ops@ptmmm.co', 'password-ok')
    expect(res.success).toBe(true)
    expect(res.role).toBe('ops')
    global.fetch = originalFetch
  })

  it('mengembalikan error jika password salah', async () => {
    ;(createClientComponentClient() as any).auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } })
    const res = await loginWithPassword('user@ptmmm.co', 'wrong')
    expect(res.success).toBe(false)
  })

  it('login sukses tetapi role null dari /api/login', async () => {
    ;(createClientComponentClient() as any).auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'UID', email: 'user@ptmmm.co' } }, error: null })
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true, role: null, redirect: '/dashboard' }) }) as any
    const res = await loginWithPassword('user@ptmmm.co', 'password-ok')
    expect(res.success).toBe(true)
    expect(res.role).toBeNull()
    global.fetch = originalFetch
  })
})
