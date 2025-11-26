import { NextResponse } from 'next/server'
import { seedOpsDriverFlow } from '@/scripts/seed-ops-driver-flow'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const token = req.headers.get('x-seed-token') || ''
  const allowDebug = String(process.env.APP_DEBUG).toLowerCase() === 'true'
  const allowToken = !!process.env.SEED_DEV_TOKEN && token === process.env.SEED_DEV_TOKEN
  if (!allowDebug && !allowToken) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  try {
    const res = await seedOpsDriverFlow()
    return NextResponse.json({ ok: true, result: res })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
