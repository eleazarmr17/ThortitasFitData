import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, supabase } from '../../../../lib/supabase';
import { checkWriteOrigin } from '../../../../lib/server-data';
export async function POST(request: Request) {
  try { checkWriteOrigin(request); } catch { return new Response('Forbidden', { status: 403 }); }
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (token) await supabase('/auth/v1/logout?scope=local', token, { method: 'POST' }).catch(() => {});
  const response = NextResponse.redirect(new URL('/login',request.url),303);
  response.headers.set('Cache-Control','no-store');
  response.cookies.set(ACCESS_COOKIE,'',cookieOptions(0)); response.cookies.set(REFRESH_COOKIE,'',cookieOptions(0)); return response;
}
