import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * GET /api/health
 * Mengembalikan status konfigurasi environment dan konektivitas Supabase.
 *
 * Status code:
 * - 200: OK (ENV lengkap & Supabase reachable)
 * - 503: Supabase unreachable (ENV lengkap, koneksi gagal)
 * - 500: Misconfig (ENV tidak lengkap)
 */
export async function GET() {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const rateLimitEnabled = (() => {
    const raw = (process.env.SCAN_RATE_LIMIT_ENABLED || '').toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
  })();

  const env = {
    supabase_url_set: !!SUPABASE_URL,
    supabase_service_key_set: !!SUPABASE_SERVICE_KEY,
    node_env: process.env.NODE_ENV || 'development',
    rate_limit_enabled: rateLimitEnabled,
  };

    let supabaseReachable = false;
    let latencyMs: number | null = null;
    let dbError: string | null = null;

  if (env.supabase_url_set && env.supabase_service_key_set) {
    const supa = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
      auth: { persistSession: false },
    });

    const t0 = Date.now();
    try {
      // HEAD count ke tabel ringan: tidak memuat data, hanya memastikan konektivitas.
      const { error } = await supa
        .from('scan_event')
        .select('id', { count: 'exact', head: true });
      latencyMs = Date.now() - t0;
      if (!error) {
        supabaseReachable = true;
      } else {
        dbError = error.message;
      }
    } catch (e: any) {
      latencyMs = Date.now() - t0;
      dbError = e?.message || 'Unknown error';
    }
  }

    const ok =
      env.supabase_url_set && env.supabase_service_key_set && supabaseReachable;
    const statusCode = ok
      ? 200
      : env.supabase_url_set && env.supabase_service_key_set
      ? 503
      : 500;

    const payload = {
      ok,
      timestamp: new Date().toISOString(),
      uptime_s: Math.round(process.uptime()),
      env,
      supabase: {
        reachable: supabaseReachable,
        latency_ms: latencyMs,
        error: supabaseReachable ? null : dbError,
      },
    };

    return new Response(JSON.stringify(payload), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'unexpected_error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
