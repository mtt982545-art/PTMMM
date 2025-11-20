import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, keyFor, resetRateLimiter } from '@/lib/rate-limit'

describe('rate-limit helper', () => {
  beforeEach(() => {
    resetRateLimiter()
    vi.useFakeTimers()
  })

  it('mengizinkan sejumlah request dalam window lalu memblokir 429', () => {
    const key = keyFor('1.2.3.4', '/api/tracking')
    const limit = 3
    const windowMs = 60_000
    const r1 = checkRateLimit(key, limit, windowMs);
    const r2 = checkRateLimit(key, limit, windowMs);
    const r3 = checkRateLimit(key, limit, windowMs);
    const r4 = checkRateLimit(key, limit, windowMs);
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(true)
    expect(r4.allowed).toBe(false)
  })

  it('reset setelah window berakhir', () => {
    const key = keyFor('5.6.7.8', '/api/scan')
    const limit = 2
    const windowMs = 10_000
    const a = checkRateLimit(key, limit, windowMs)
    const b = checkRateLimit(key, limit, windowMs)
    const c = checkRateLimit(key, limit, windowMs)
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
    expect(c.allowed).toBe(false)
    vi.advanceTimersByTime(windowMs + 1)
    const d = checkRateLimit(key, limit, windowMs)
    expect(d.allowed).toBe(true)
  })
})