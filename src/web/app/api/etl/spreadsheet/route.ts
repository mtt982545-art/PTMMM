import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import { z } from 'zod'

const ImportSchema = z.object({
  source: z.string().min(1),
  sheet_name: z.string().min(1),
  rows: z.array(z.record(z.string(), z.any())).min(1),
  meta: z.record(z.string(), z.any()).optional(),
})

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-etl-token') || ''
  if (!process.env.ETL_WRITE_TOKEN || token !== process.env.ETL_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Bad JSON' }, { status: 400 })
  }

  const parsed = ImportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Invalid payload' }, { status: 400 })
  }

  const d = parsed.data
  const imp = await prisma.spreadsheetImport.create({
    data: {
      source: d.source,
      sheetName: d.sheet_name,
      rows: d.rows.length,
      status: 'done',
      meta: d.meta ?? undefined,
    },
  })

  if (d.rows.length > 0) {
    await prisma.spreadsheetRow.createMany({
      data: d.rows.map((r, i) => ({ importId: imp.id, rowIndex: i + 1, data: r })),
    })
  }

  return NextResponse.json({ ok: true, import_id: imp.id, rows: d.rows.length })
}
