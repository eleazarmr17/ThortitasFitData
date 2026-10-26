import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, supabase } from './lib/supabase';
export async function proxy(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value, refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let exp = 0;
  try { exp = JSON.parse(atob((access || '').split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp || 0; } catch {}
  // exp decides when to refresh; protected routes separately verify identity.
  if (!refresh || exp > Date.now()/1000 + 90) return NextResponse.next();
  try {
    const session = await supabase<any>('/auth/v1/token?grant_type=refresh_token', undefined, { method: 'POST', body: JSON.stringify({ refresh_token: refresh }) });
    request.cookies.set(ACCESS_COOKIE, session.access_token); request.cookies.set(REFRESH_COOKIE, session.refresh_token);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(ACCESS_COOKIE, session.access_token, cookieOptions(session.expires_in));
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, cookieOptions(30*86400));
    response.headers.set('Cache-Control','private, no-store'); return response;
  } catch { return NextResponse.next(); }
}
export const config = { matcher: ['/', '/api/data', '/api/export', '/api/media', '/login'] };
