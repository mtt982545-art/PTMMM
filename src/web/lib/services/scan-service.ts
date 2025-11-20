import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { z } from 'zod';

const ALLOWED_EVENT_TYPES = ['gate_in','gate_out','load_start','load_finish','scan','pod'] as const;
const ScanCreateSchema = z.object({
  formCode: z.string().min(1),
  shipmentId: z.string().optional(),
  warehouseId: z.string().optional(),
  eventType: z.enum(ALLOWED_EVENT_TYPES),
  refType: z.string().optional(),
  payload: z.record(z.string(), z.any()).default({}),
  userEmail: z.string().email().optional(),
  idempotencyKey: z.string().optional(),
  ts: z.string().optional(),
});

export type ScanCreateInput = z.infer<typeof ScanCreateSchema>;

export function parseScanCreate(data: unknown): ScanCreateInput {
  return ScanCreateSchema.parse(data as ScanCreateInput);
}

export async function insertScanEvent(parsed: ScanCreateInput) {
  if (parsed.idempotencyKey) {
    const dup = await prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(*) AS cnt
      FROM scan_event
      WHERE formCode = ${parsed.formCode}
        AND eventType = ${parsed.eventType}
        AND JSON_EXTRACT(payload, '$.idempotency_key') = ${parsed.idempotencyKey}
    `;
    if ((dup[0]?.cnt ?? 0) > 0) {
      throw new AppError(409, 'Duplicate event');
    }
  }
  return prisma.scanEvent.create({
    data: {
      formCode: parsed.formCode,
      shipmentId: parsed.shipmentId ?? null,
      warehouseId: parsed.warehouseId ?? null,
      eventType: parsed.eventType,
      refType: parsed.refType ?? null,
      payload: parsed.payload,
      userEmail: parsed.userEmail ?? null,
      ts: parsed.ts ? new Date(parsed.ts) : null,
    },
  });
}

export async function createScanEvent(data: ScanCreateInput) {
  const parsed = parseScanCreate(data);
  return insertScanEvent(parsed);
}