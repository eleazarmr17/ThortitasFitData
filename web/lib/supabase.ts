import { cookies } from 'next/headers';

export const ACCESS_COOKIE = 'thortitas-access';
export const REFRESH_COOKIE = 'thortitas-refresh';
export type AppUser = { userId: string; displayName: string; email: string; accessToken: string };
export function config() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration is missing.');
  return { url: url.replace(/\/$/, ''), key };
}
export class DataError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
// Use the person's JWT so database policies apply. No service-role key is used.
export async function supabase<T = any>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = config(); const headers = new Headers(init.headers);
  headers.set('apikey', key);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type') && typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  const response = await fetch(`${url}${path}`, { ...init, headers, cache: 'no-store', signal: init.signal ?? AbortSignal.timeout(20000) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new DataError(response.status, error.code || '', error.message || error.msg || 'The data service is unavailable.');
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T;
  const value = await response.text(); return (value ? JSON.parse(value) : undefined) as T;
}
export async function currentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    // Ask Auth to verify the token; a decoded cookie is never an identity.
    const user = await supabase<any>('/auth/v1/user', token);
    if (!user.id || !user.email || !user.email_confirmed_at || user.is_anonymous) return null;
    if (!await supabase<boolean>('/rest/v1/rpc/can_access_app', token, { method: 'POST', body: '{}' })) return null;
    return { userId: user.id, displayName: user.email.split('@')[0], email: user.email, accessToken: token };
  } catch (error) {
    if (error instanceof DataError && [400,401,403].includes(error.status)) return null;
    throw error;
  }
}
export function rest<T = any>(user: AppUser, path: string, init: RequestInit = {}) {
  return supabase<T>(`/rest/v1/${path}`, user.accessToken, init);
}
export const query = (values: Record<string,string>) => new URLSearchParams(values).toString();
export function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge };
}
