import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { z } from 'zod';
import { maybeAdvanceShipmentLeg } from '@/lib/services/multi-warehouse-service'
import { normalizeRoutePath, isWarehouseValidForEvent } from '@/lib/domain/route-helpers'
import { createMmSyncService } from '@/lib/services/mm-sync-service'
import { resolveShipmentId, resolveWarehouseId } from '@/lib/services/shipments-service'
import { applyScanEventToInventory } from '@/lib/services/inventory-movement-service'
import type { ScanEventType } from '@/lib/types'

const ALLOWED_EVENT_TYPES = ['gate_in','gate_out','load_start','load_finish','scan','pod'] as const satisfies readonly ScanEventType[];
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

async function validateRouteLeg(shipmentId?: string, warehouseId?: string, eventType?: ScanEventType) {
  if (!shipmentId || !warehouseId || !eventType) return
  const looksUuid = shipmentId.length === 36 && shipmentId.includes('-')
  const rows = looksUuid
    ? await prisma.$queryRaw<Array<{ route_path: any; current_leg_index: number }>>`SELECT route_path, current_leg_index FROM shipments WHERE id = ${shipmentId} LIMIT 1`
    : await prisma.$queryRaw<Array<{ route_path: any; current_leg_index: number }>>`SELECT route_path, current_leg_index FROM shipments WHERE shipment_id = ${shipmentId} LIMIT 1`
  if (!rows.length) { if (eventType !== 'scan') throw new AppError(400, 'Invalid leg'); return }
  const routePath = normalizeRoutePath(rows[0]?.route_path)
  const idx = Number(rows[0]?.current_leg_index ?? 0)
  const ok = isWarehouseValidForEvent(routePath, idx, warehouseId, eventType)
  if (!ok) throw new AppError(400, 'Invalid leg')
}

async function ensureIdempotency(formCode: string, eventType: string, idempotencyKey?: string) {
  // Raw write untuk audit trail: idempotensi mencegah duplikasi yang sama persis (idempotency_key)
  // Deduplikasi logis (last writer wins per eventType+shipmentId/formCode) dilakukan di tracking-service (layer baca)
  if (!idempotencyKey) return;
  const dup = await prisma.$queryRaw<Array<{ cnt: number }>>`
    SELECT COUNT(*) AS cnt
    FROM scan_event
    WHERE form_code = ${formCode}
      AND event_type = ${eventType}
      AND JSON_EXTRACT(payload, '$.idempotency_key') = ${idempotencyKey}
  `;
  if ((dup[0]?.cnt ?? 0) > 0) {
    throw new AppError(409, 'Duplicate event');
  }
}

export async function insertScanEvent(parsed: ScanCreateInput) {
  // Integrasi lintas role:
  // Security/Ops → /api/scan → scan_event (raw, audit) → getTrackingTimeline(token) (dedup: last writer wins) → UI Driver
  // KPI tetap menghitung semua raw event di analytics-service (tanpa dedup)
  await ensureIdempotency(parsed.formCode, parsed.eventType, parsed.idempotencyKey)
  await validateRouteLeg(parsed.shipmentId, parsed.warehouseId, parsed.eventType)
  // Resolve internal IDs for foreign keys
  const shipInternalId = await resolveShipmentId(parsed.shipmentId)
  const whInternalId = await resolveWarehouseId(parsed.warehouseId)
  const evt = await prisma.scanEvent.create({
    data: {
      formCode: parsed.formCode,
      shipmentId: shipInternalId,
      warehouseId: whInternalId,
      eventType: parsed.eventType,
      refType: parsed.refType ?? null,
      payload: parsed.payload,
      userEmail: parsed.userEmail ?? null,
      ts: parsed.ts ? new Date(parsed.ts) : null,
    },
  });
  try {
    await maybeAdvanceShipmentLeg({ shipmentId: parsed.shipmentId ?? null, warehouseId: parsed.warehouseId ?? null, eventType: parsed.eventType })
  } catch {}
  try {
    const mmSync = createMmSyncService()
    const sh = (await prisma.shipment.findFirst({ where: { shipmentId: parsed.shipmentId ?? '' }, select: { organizationId: true, warehouseId: true, routeId: true, status: true } })) as any
    let currentLegIndex = 0
    try {
      const rows = await prisma.$queryRaw<Array<{ current_leg_index: number }>>`SELECT current_leg_index FROM shipments WHERE shipment_id = ${parsed.shipmentId ?? ''} LIMIT 1`
      currentLegIndex = Number(rows[0]?.current_leg_index ?? 0)
    } catch {}
    const at = parsed.ts ? new Date(parsed.ts).toISOString() : new Date().toISOString()
    const eventDto = { id: evt.id, shipmentId: parsed.shipmentId ?? '', routeId: sh?.routeId ?? undefined, scannerUserId: parsed.userEmail ?? '', orgId: sh?.organizationId ?? '', warehouseId: sh?.warehouseId ?? '', scanToken: parsed.formCode, eventType: parsed.eventType as ScanEventType, at, meta: parsed.payload }
    const progressDto = sh ? { routeId: sh.routeId ?? '', shipmentId: parsed.shipmentId ?? '', currentLegIndex, status: (sh.status || 'in_transit') as any, at } : undefined
    await mmSync.syncScanEventAndProgress(eventDto as any, progressDto as any)
  } catch {}
  try {
    await applyScanEventToInventory({ shipmentId: parsed.shipmentId ?? undefined, warehouseId: parsed.warehouseId ?? undefined, eventType: parsed.eventType, refType: parsed.refType })
  } catch {}
  return evt
}

export async function createScanEvent(data: ScanCreateInput) {
  const parsed = parseScanCreate(data);
  return insertScanEvent(parsed);
}
