import { describe, it, expect, vi, beforeEach } from 'vitest'



vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      $queryRaw: vi.fn(),
      scanEvent: { create: vi.fn() },
    },
  }
})

import { prisma } from '@/lib/prisma'
import { createScanEvent } from '@/lib/services/scan-service'
import { AppError } from '@/lib/errors'

describe('scan-service.createScanEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('membuat event scan valid dan mengembalikan eventType benar', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ cnt: 0 }])
    ;(prisma.scanEvent.create as any).mockResolvedValue({ id: 'EVT-1', eventType: 'gate_in' })

    const res = await createScanEvent({
      formCode: 'FORM-OPS-001',
      eventType: 'gate_in',
      payload: { idempotency_key: 'KEY-1' },
      idempotencyKey: 'KEY-1',
    })

    expect(res).toBeDefined()
    expect(res.eventType).toBe('gate_in')
    expect(prisma.scanEvent.create).toHaveBeenCalled()
  })

  it('idempotensi: panggilan kedua dengan idempotencyKey sama melempar 409', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ cnt: 1 }])

    await expect(
      createScanEvent({
        formCode: 'FORM-OPS-001',
        eventType: 'gate_in',
        payload: { idempotency_key: 'KEY-1' },
        idempotencyKey: 'KEY-1',
      })
    ).rejects.toEqual(new AppError(409, 'Duplicate event'))
  })

  it('membuat event gate_out valid', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ cnt: 0 }])
    ;(prisma.scanEvent.create as any).mockResolvedValue({ id: 'EVT-2', eventType: 'gate_out' })

    const res = await createScanEvent({
      formCode: 'FORM-OPS-001',
      eventType: 'gate_out',
      payload: { idempotency_key: 'KEY-2' },
      idempotencyKey: 'KEY-2',
    })

    expect(res).toBeDefined()
    expect(res.eventType).toBe('gate_out')
    expect(prisma.scanEvent.create).toHaveBeenCalled()
  })

  it('idempotensi: load_start duplikat melempar 409', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ cnt: 1 }])
    await expect(
      createScanEvent({
        formCode: 'FORM-OPS-001',
        eventType: 'load_start',
        payload: { idempotency_key: 'KEY-3' },
        idempotencyKey: 'KEY-3',
      })
    ).rejects.toEqual(new AppError(409, 'Duplicate event'))
  })

  it('membuat event load_finish valid', async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([{ cnt: 0 }])
    ;(prisma.scanEvent.create as any).mockResolvedValue({ id: 'EVT-3', eventType: 'load_finish' })
    const res = await createScanEvent({
      formCode: 'FORM-OPS-001',
      eventType: 'load_finish',
      payload: { idempotency_key: 'KEY-4' },
      idempotencyKey: 'KEY-4',
    })
    expect(res).toBeDefined()
    expect(res.eventType).toBe('load_finish')
  })
})
