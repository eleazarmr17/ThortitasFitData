import { authenticated, boundedBody, checkWriteOrigin, ensureUser, errorResponse } from '../../../lib/server-data';
import { config, query, rest, supabase } from '../../../lib/supabase';
import { ApiError } from '../../../lib/server-validation';
export const dynamic='force-dynamic';
const MAX_SIZE=3*1024*1024;
function identify(bytes: Uint8Array): string|null {
  if (bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)) return 'image/png';
  if (['GIF87a','GIF89a'].includes(String.fromCharCode(...bytes.slice(0,6)))) return 'image/gif';
  if (String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP') return 'image/webp';
  return null;
}
export async function POST(request: Request) {
  try {
    checkWriteOrigin(request); const user=await authenticated(); await ensureUser(user);
    const body=await boundedBody(request,MAX_SIZE+65536);
    const form=await new Response(body,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData(); const file=form.get('file');
    if (!file||typeof file==='string'||!file.size||file.size>MAX_SIZE) throw new ApiError('Choose a photo smaller than 3 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer()), contentType=identify(bytes);
    if (!contentType) throw new ApiError('Choose a JPEG, PNG, WebP or GIF photo.');
    const key=crypto.randomUUID(), path=`${user.userId}/${key}`;
    await supabase(`/storage/v1/object/fitness-photos/${path}`,user.accessToken,{method:'POST',headers:{'Content-Type':contentType},body:bytes});
    try {
      await rest(user,'media',{method:'POST',body:JSON.stringify({key,user_id:user.userId,storage_path:path,content_type:contentType})});
    } catch(error) {
      await supabase('/storage/v1/object/fitness-photos',user.accessToken,{method:'DELETE',body:JSON.stringify({prefixes:[path]})}).catch(()=>{}); throw error;
    }
    return Response.json({key,url:`/api/media?key=${key}`},{status:201,headers:{'Cache-Control':'no-store'}});
  } catch(error) { return errorResponse(error); }
}
export async function GET(request: Request) {
  try {
    const user=await authenticated(), key=new URL(request.url).searchParams.get('key');
    if (!key||!/^[a-f0-9-]{36}$/i.test(key)) throw new ApiError('Photo not found.',404);
    const records=await rest<any[]>(user,`media?${query({key:`eq.${key}`,select:'storage_path,content_type',limit:'1'})}`), record=records[0];
    if (!record) throw new ApiError('Photo not found.',404);
    const settings=config();
    const file=await fetch(`${settings.url}/storage/v1/object/authenticated/fitness-photos/${record.storage_path}`,{headers:{apikey:settings.key,Authorization:`Bearer ${user.accessToken}`},cache:'no-store',signal:AbortSignal.timeout(20000)});
    if (!file.ok) throw new ApiError('Photo not found.',404);
    return new Response(file.body,{headers:{'Content-Type':record.content_type,'Content-Disposition':'inline','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Vary':'Cookie','Content-Security-Policy':"default-src 'none'"}});
  } catch(error) { return errorResponse(error); }
}
