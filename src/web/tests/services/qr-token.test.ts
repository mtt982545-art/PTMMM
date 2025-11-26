import { describe, it, expect } from 'vitest'
import { buildShipmentQrToken } from '@/lib/services/qr-token'

describe('qr-token.buildShipmentQrToken', () => {
  it('includes productCode and invoice when provided', () => {
    const t = buildShipmentQrToken({ shipmentId: 'SHP-1', formCode: 'FORM-OPS-001', orgCode: 'ORG-A', warehouseCode: 'WH-A', productCode: 'PRD-1', invoiceNo: 'INV-9' })
    expect(t).toBe('QR-SHP-1-FORM-OPS-001-PRD-1-ORG-A-WH-A-INV-9')
  })

  it('omits productCode when not provided', () => {
    const t = buildShipmentQrToken({ shipmentId: 'SHP-1', formCode: 'FORM-OPS-001', orgCode: 'ORG-A', warehouseCode: 'WH-A' })
    expect(t).toBe('QR-SHP-1-FORM-OPS-001-ORG-A-WH-A')
  })

  it('omits invoice when not provided', () => {
    const t = buildShipmentQrToken({ shipmentId: 'SHP-1', formCode: 'FORM-OPS-001', orgCode: 'ORG-A', warehouseCode: 'WH-A', productCode: 'PRD-1' })
    expect(t).toBe('QR-SHP-1-FORM-OPS-001-PRD-1-ORG-A-WH-A')
  })
})
