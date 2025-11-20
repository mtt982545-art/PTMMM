import { NextResponse } from 'next/server'

const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9oO2KqQAAAAASUVORK5CYII='

export const runtime = 'nodejs'

export async function GET() {
  const bytes = Buffer.from(PNG_BASE64, 'base64')
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}

