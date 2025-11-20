import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ ok: true, message: 'Logout berhasil' });
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'Terjadi kesalahan saat logout' }, { status: 500 });
  }
}