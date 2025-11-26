import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { z } from 'zod';

const ImportSchema = z.object({
  source: z.string().min(1),
  sheetName: z.string().min(1),
  rows: z.array(z.record(z.string(), z.any())),
  meta: z.record(z.string(), z.any()).optional(),
});

export type EtlImportInput = z.infer<typeof ImportSchema>;

export async function importSpreadsheet(data: EtlImportInput) {
  const parsed = ImportSchema.parse(data);
  if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
    throw new AppError(400, 'Rows required');
  }
  const res = await prisma.$transaction(async (tx) => {
    const anyTx = tx as any
    const imp = await anyTx.spreadsheetImport.create({
      data: {
        source: parsed.source,
        sheetName: parsed.sheetName,
        rows: parsed.rows.length,
        status: 'done',
        meta: parsed.meta ?? undefined,
      },
    });
    await anyTx.spreadsheetRow.createMany({
      data: parsed.rows.map((r, i) => ({ importId: imp.id, rowIndex: i + 1, data: r })),
    });
    try {
      const s = parsed.sheetName.toLowerCase()
      if (s.includes('order')) {
        for (const r of parsed.rows) {
          const oc = String((r as any)?.order_code || '')
          if (!oc) continue
          await tx.$executeRaw`INSERT INTO orders (order_code, customer, origin, destination, status) VALUES (${oc}, ${(r as any)?.customer ?? ''}, ${(r as any)?.origin ?? ''}, ${(r as any)?.destination ?? ''}, ${(r as any)?.status ?? 'new'})`
        }
      } else if (s.includes('shipment')) {
        for (const r of parsed.rows) {
          const sid = String((r as any)?.shipment_id || '')
          if (!sid) continue
          await tx.$executeRaw`INSERT INTO shipments (shipment_id, customer, origin, destination, status) VALUES (${sid}, ${(r as any)?.customer ?? ''}, ${(r as any)?.origin ?? ''}, ${(r as any)?.destination ?? ''}, ${(r as any)?.status ?? 'in_transit'})`
        }
      } else if (s.includes('event')) {
        for (const r of parsed.rows) {
          await tx.$executeRaw`INSERT INTO scan_event (id, formCode, shipmentId, warehouseId, eventType, refType, payload, userEmail, ts, createdAt) VALUES (${(r as any)?.id ?? null}, ${(r as any)?.formCode ?? ''}, ${(r as any)?.shipmentId ?? null}, ${(r as any)?.warehouseId ?? null}, ${(r as any)?.eventType ?? ''}, ${(r as any)?.refType ?? null}, ${JSON.stringify((r as any)?.payload ?? {})}, ${(r as any)?.userEmail ?? null}, ${((r as any)?.ts ? new Date((r as any)?.ts) : null)}, ${new Date()})`
        }
      }
    } catch {}
    return { importId: imp.id, rows: parsed.rows.length };
  });
  return res;
}
