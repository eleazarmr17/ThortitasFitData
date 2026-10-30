import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, supabase } from '../../../../lib/supabase';
import { boundedBody, checkWriteOrigin } from '../../../../lib/server-data';
export async function POST(request: Request) {
  try {
    checkWriteOrigin(request);
    const { email, password } = JSON.parse(new TextDecoder().decode(await boundedBody(request, 16000)));
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 512) throw Error();
    const session = await supabase<any>('/auth/v1/token?grant_type=password', undefined, { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
    const allowed = session.user?.email_confirmed_at && !session.user?.is_anonymous && await supabase<boolean>('/rest/v1/rpc/can_access_app', session.access_token, { method: 'POST', body: '{}' });
    if (!allowed) { await supabase('/auth/v1/logout', session.access_token, { method: 'POST' }).catch(() => {}); throw Error(); }
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(ACCESS_COOKIE, session.access_token, cookieOptions(session.expires_in));
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, cookieOptions(30*86400)); return response;
  } catch {
    return NextResponse.json({ error: 'Sign-in failed. Check your email and password. Access is limited to the two approved accounts.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
}
