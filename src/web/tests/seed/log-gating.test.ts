import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

it('does not log in production when seeding scan events', async () => {
  vi.stubEnv('NODE_ENV', 'production')

  vi.mock('@/lib/services/scan-service', () => {
    return { insertScanEvent: vi.fn().mockResolvedValue(undefined) }
  })

  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

  const seed = await import('@/prisma/seed')
  await seed.seedScanEventForShipment({
    formCode: 'FORM-OPS-001',
    shipmentId: 'SHP-TEST',
    warehouseId: 'WH-TEST',
    eventType: 'gate_in',
    refType: 'Gate',
    payload: {},
    userEmail: 'security@ptmmm.co.id',
    idempotencyKey: 'seed:TEST:gate_in',
    ts: new Date().toISOString(),
  })

  const calls = logSpy.mock.calls.map(args => String(args[0] ?? ''))
  expect(calls.some(msg => msg.includes('[seed][scan_event]'))).toBe(false)
  logSpy.mockRestore()
  vi.unstubAllEnvs()
})
