import { describe, it, expect, vi, beforeEach } from 'vitest'



vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      $transaction: vi.fn(),
    },
  }
})

import { prisma } from '@/lib/prisma'
import { importSpreadsheet } from '@/lib/services/etl-service'
import { AppError } from '@/lib/errors'

describe('etl-service.importSpreadsheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('payload valid: mengembalikan importId + rows', async () => {
    ;(prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        spreadsheetImport: {
          create: vi.fn().mockResolvedValue({ id: 'IMP-1' }),
        },
        spreadsheetRow: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }
      return cb(tx)
    })

    const res = await importSpreadsheet({
      source: 'apps_script',
      sheetName: 'Orders',
      rows: [{ order_id: 'ORD-001' }],
    })

    expect(res.importId).toBe('IMP-1')
    expect(res.rows).toBe(1)
  })

  it('payload invalid: rows kosong melempar AppError 400', async () => {
    await expect(
      importSpreadsheet({ source: 'apps_script', sheetName: 'Orders', rows: [] })
    ).rejects.toEqual(new AppError(400, 'Rows required'))
  })
})