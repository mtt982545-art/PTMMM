import { NextRequest } from 'next/server';
// read cookies from request headers to avoid next runtime dependency in tests
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const cookie = req.headers.get('cookie') || ''
  const isDemo = /(?:^|;\s*)demo_session=1(?:;|$)/.test(cookie)
  if (isDemo) {
    return new Response('Forbidden: demo mode', { status: 403 })
  }
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const PROGRESS_WRITE_TOKEN = process.env.PROGRESS_WRITE_TOKEN;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response('Supabase not configured', { status: 500 });
  }
  const guard = req.headers.get('x-progress-token') || '';
  if (!PROGRESS_WRITE_TOKEN || guard !== PROGRESS_WRITE_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const { bundle_id, task_id, done, actor } = body || {};
  if (!bundle_id || !task_id || typeof done !== 'boolean') {
    return new Response('Bad Request', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { error } = await supabase.from('bundle_task_progress').upsert(
    { bundle_id, task_id, done, actor: actor || 'ui', updated_at: new Date().toISOString() },
    { onConflict: 'bundle_id,task_id' }
  );
  if (error) return new Response('DB error: ' + error.message, { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
