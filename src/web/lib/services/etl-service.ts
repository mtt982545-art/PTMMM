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
    const imp = await tx.spreadsheetImport.create({
      data: {
        source: parsed.source,
        sheetName: parsed.sheetName,
        rows: parsed.rows.length,
        status: 'done',
        meta: parsed.meta ?? undefined,
      },
    });
    await tx.spreadsheetRow.createMany({
      data: parsed.rows.map((r, i) => ({ importId: imp.id, rowIndex: i + 1, data: r })),
    });
    return { importId: imp.id, rows: parsed.rows.length };
  });
  return res;
}
