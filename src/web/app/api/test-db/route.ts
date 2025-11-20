import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

async function testDatabaseConnection() {
  const prisma = new PrismaClient()
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    return { success: true }
  } catch (error: any) {
    return { success: false, message: 'Database connection failed', error }
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  try {
    const result = await testDatabaseConnection()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        error: result.error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Test connection endpoint error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}