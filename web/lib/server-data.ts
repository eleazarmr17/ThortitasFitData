import { currentUser, rest, query, DataError, type AppUser } from './supabase';
import { ApiError, numeric, object, text, validateProfile, validateRecord, type JsonRecord } from './server-validation';

const TABLES = { routine: 'routines', session: 'sessions', step: 'daily_steps', weight: 'body_weights', goal: 'goals', challenge: 'challenges', post: 'posts' } as const;
type Entity = keyof typeof TABLES;
type Row = { id: string; user_id: string; data: JsonRecord; created_at: string; updated_at: string };
const now = () => new Date().toISOString();
const unpack = (row: Row) => ({ ...row.data, id: row.id, userId: row.user_id, createdAt: row.created_at, updatedAt: row.updated_at });
const profile = (row: any) => ({ weeklyTarget: 4, stepTarget: 10000, ...row.profile });
export async function authenticated(): Promise<AppUser> {
  const user = await currentUser();
  if (!user) throw new ApiError('Sign in to access your private fitness data.',401);
  return user;
}
export function checkWriteOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError('This request must come from your fitness app.',403);
}
export async function boundedBody(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new ApiError('This upload or record is too large.',413);
  const reader = request.body?.getReader(); if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new ApiError('This upload or record is too large.',413); }
    chunks.push(chunk.value);
  }
  const result = new Uint8Array(size); let offset=0;
  for (const chunk of chunks) { result.set(chunk,offset); offset+=chunk.byteLength; }
  return result;
}
async function rows<T = any>(user: AppUser, table: string, filters: Record<string,string> = {}): Promise<T[]> {
  const output: T[] = [];
  for (let start=0;;start+=500) {
    const page = await rest<T[]>(user, `${table}?${query({ select:'*', order:'created_at.desc,id.desc', ...filters, offset:String(start), limit:'500' })}`);
    output.push(...page); if (page.length<500) return output;
  }
}
async function one<T = any>(user: AppUser, table: string, filters: Record<string,string>) {
  const result = await rest<T[]>(user,`${table}?${query({select:'*',...filters,limit:'1'})}`); return result[0] || null;
}
async function write(user: AppUser, table: string, body: any, conflict='id') {
  return rest<any[]>(user,`${table}?${query({on_conflict:conflict})}`,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});
}
async function remove(user: AppUser, table: string, filters: Record<string,string>) {
  return rest<any[]>(user,`${table}?${query(filters)}`,{method:'DELETE',headers:{Prefer:'return=representation'}});
}
export async function ensureUser(user: AppUser) {
  await rest(user,'rpc/bootstrap_profile',{method:'POST',body:JSON.stringify({p_name:user.displayName,p_email:user.email})});
  const me = await one(user,'users',{id:`eq.${user.userId}`});
  if (!me) throw new ApiError('Your profile could not be loaded.',503); return me;
}
export async function allowedIds(user: AppUser): Promise<string[]> {
  const people = await rest<any[]>(user,'users?select=id'); return people.map(p=>p.id);
}
async function partnerId(user: AppUser): Promise<string|null> { return (await allowedIds(user)).find(id=>id!==user.userId) || null; }
async function ownRecord(user: AppUser, table: string, id: string): Promise<Row|null> {
  const row=await one<Row>(user,table,{id:`eq.${id}`});
  if (row && row.user_id!==user.userId) throw new ApiError('You can only change your own records.',403); return row;
}
async function readablePost(user: AppUser, id: string) {
  const row=await one<Row>(user,'posts',{id:`eq.${id}`});
  if (!row) throw new ApiError('That post is unavailable.',404); return row;
}
async function photoOwner(user: AppUser, value: unknown) {
  if (!value) return;
  const url=new URL(String(value),'https://fitness.local');
  if (url.origin!=='https://fitness.local' || url.pathname!=='/api/media') throw new ApiError('Choose one of your own uploaded photos.',403);
  const key=url.searchParams.get('key');
  const row=key && await one<any>(user,'media',{key:`eq.${key}`});
  if (!row || row.user_id!==user.userId) throw new ApiError('Choose one of your own uploaded photos.',403);
}
async function notify(user: AppUser, recipient: string, message: string) {
  await rest(user,'notifications',{method:'POST',body:JSON.stringify({user_id:recipient,actor_id:user.userId,text:message})});
}
export async function snapshot(user: AppUser): Promise<JsonRecord> {
  const me=await ensureUser(user);
  const entries=Object.entries(TABLES);
  const result: JsonRecord={};
  const outputNames: Record<Entity,string>={routine:'routines',session:'sessions',step:'steps',weight:'weights',goal:'goals',challenge:'challenges',post:'posts'};
  const results=await Promise.all(entries.map(([,table])=>rows<Row>(user,table)));
  entries.forEach(([entity],i)=>{result[outputNames[entity as Entity]]=results[i].map(unpack);});
  const [likes,comments,favorites,notifications,people,contributions]=await Promise.all([
    rows(user,'post_likes'), rows(user,'post_comments',{order:'created_at.asc,id.asc'}),
    rows(user,'favorites',{user_id:`eq.${user.userId}`}), rows(user,'notifications',{user_id:`eq.${user.userId}`}),
    rows(user,'users'), rows(user,'challenge_contributions'),
  ]);
  result.posts=result.posts.map((post:any)=>({...post,
    likes:likes.filter(l=>l.post_id===post.id).map(l=>l.user_id),
    comments:comments.filter(c=>c.post_id===post.id).map(c=>({id:c.id,userId:c.user_id,name:profile(people.find(p=>p.id===c.user_id)||{}).displayName || people.find(p=>p.id===c.user_id)?.name || 'Partner',text:c.text,createdAt:c.created_at})),
  }));
  result.challenges=result.challenges.map((c:any)=>({...c,manualProgress:Object.fromEntries(contributions.filter(p=>p.challenge_id===c.id).map(p=>[p.user_id,Number(p.current)]))}));
  result.meals=result.posts.filter((post:any)=>post.type==='meal');
  result.favorites=favorites.filter(f=>f.kind!=='recipe'||result.posts.some((p:any)=>p.id===f.target_id)).map(f=>({id:f.id,userId:f.user_id,kind:f.kind,targetId:f.target_id}));
  result.notifications=notifications.slice(0,100).map(n=>({id:n.id,text:n.text,read:!!n.read,createdAt:n.created_at}));
  result.profile=profile(me);
  result.user={id:me.id,name:result.profile.displayName || me.name,email:me.email,profile:result.profile};
  const partner=people.find(p=>p.id!==user.userId);
  result.partner=partner?{id:partner.id,name:profile(partner).displayName||partner.name,profile:profile(partner)}:null;
  return result;
}
function entityName(value: unknown): Entity {
  if (typeof value!=='string'||!Object.hasOwn(TABLES,value)) throw new ApiError('Unknown record type.'); return value as Entity;
}
export async function mutate(user: AppUser, input: unknown): Promise<JsonRecord> {
  const payload=object(input,'Request'), action=text(payload.action,'Action',50,true);
  const me=await ensureUser(user), name=profile(me).displayName || me.name;
  if (action==='profile') {
    const next={...me.profile,...validateProfile(payload.profile)}; await photoOwner(user,next.avatar);
    await rest(user,`users?${query({id:`eq.${user.userId}`})}`,{method:'PATCH',body:JSON.stringify({profile:next})});
  } else if (action==='upsert') {
    const entity=entityName(payload.entity), table=TABLES[entity], source=object(payload.record);
    const id=source.id?text(source.id,'Record ID',220,true):crypto.randomUUID();
    const existing=await ownRecord(user,table,id), record=validateRecord(entity,source);
    await photoOwner(user,record.photo);
    if (entity==='post'&&record.sessionId&&!await ownRecord(user,'sessions',record.sessionId)) throw new ApiError('The selected workout is unavailable.');
    if (entity==='challenge') delete record.manualProgress;
    const body: any={id,user_id:user.userId,data:record,updated_at:now()};
    if (entity==='step') body.date=record.date;
    // Omit a new step's ID when upserting by date, preserving the existing ID.
    if (entity==='step'&&!existing) { delete body.id; await write(user,table,body,'user_id,date'); }
    else await write(user,table,body);
    if (entity==='challenge') {
      const current=numeric(source.current??source.manualProgress?.[user.userId]??0,'Your challenge contribution',0,100000000);
      await write(user,'challenge_contributions',{challenge_id:id,user_id:user.userId,current},'challenge_id,user_id');
    }
    if (!existing&&(entity==='session'||entity==='post')) {
      const partner=await partnerId(user);
      if (partner) await notify(user,partner,`${name} ${entity==='session'?`completed ${record.name}`:`shared ${record.type==='meal'?'a meal':'an activity'}`}.`);
    }
  } else if (action==='challenge.progress') {
    const id=text(payload.id,'Challenge ID',220,true), current=numeric(payload.current,'Your challenge contribution',0,100000000);
    const challenge=await one<Row>(user,'challenges',{id:`eq.${id}`});
    if (!challenge) throw new ApiError('That challenge is unavailable.',404);
    if (challenge.data.type!=='custom') throw new ApiError('This challenge updates automatically from your records.');
    await write(user,'challenge_contributions',{challenge_id:id,user_id:user.userId,current},'challenge_id,user_id');
  } else if (action==='delete') {
    const table=TABLES[entityName(payload.entity)], id=text(payload.id,'Record ID',220,true);
    if (!await ownRecord(user,table,id)) throw new ApiError('Record not found.',404);
    await remove(user,table,{id:`eq.${id}`,user_id:`eq.${user.userId}`});
  } else if (action==='like'||action==='comment') {
    const postId=text(payload.postId,'Post ID',220,true), post=await readablePost(user,postId);
    if (action==='like') {
      const existing=await one<any>(user,'post_likes',{post_id:`eq.${postId}`,user_id:`eq.${user.userId}`});
      if (existing) await remove(user,'post_likes',{id:`eq.${existing.id}`,user_id:`eq.${user.userId}`});
      else {
        await write(user,'post_likes',{post_id:postId,user_id:user.userId},'post_id,user_id');
        if (post.user_id!==user.userId) await notify(user,post.user_id,`${name} liked your post.`);
      }
    } else {
      await rest(user,'post_comments',{method:'POST',body:JSON.stringify({post_id:postId,user_id:user.userId,text:text(payload.text,'Comment',3000,true)})});
      if (post.user_id!==user.userId) await notify(user,post.user_id,`${name} commented on your post.`);
    }
  } else if (action==='comment.delete') {
    const deleted=await remove(user,'post_comments',{id:`eq.${text(payload.id,'Comment ID',220,true)}`,user_id:`eq.${user.userId}`});
    if (!deleted.length) throw new ApiError('You can only delete your own comments.',403);
  } else if (action==='favorite') {
    const kind=payload.kind==='recipe'?'recipe':'exercise', targetId=text(payload.targetId,'Favorite',220,true);
    if (kind==='recipe') await readablePost(user,targetId);
    const existing=await one<any>(user,'favorites',{user_id:`eq.${user.userId}`,kind:`eq.${kind}`,target_id:`eq.${targetId}`});
    if (existing) await remove(user,'favorites',{id:`eq.${existing.id}`,user_id:`eq.${user.userId}`});
    else await write(user,'favorites',{user_id:user.userId,kind,target_id:targetId},'user_id,kind,target_id');
  } else if (action==='notifications.read') {
    await rest(user,`notifications?${query({user_id:`eq.${user.userId}`})}`,{method:'PATCH',body:JSON.stringify({read:true})});
  } else throw new ApiError('Unknown action.');
  return snapshot(user);
}
export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});
  // Log a code rather than tokens, submitted bodies, or personal records.
  console.error('Fitness API failed:',error instanceof DataError?error.code:'unexpected_error');
  const status=error instanceof DataError?(error.code==='23505'?409:error.status===403?403:503):500;
  return Response.json({error:status===409?'That entry already exists. Refresh and try again.':status===403?'You do not have permission to change this record.':'Your request could not be completed. Please try again.'},{status,headers:{'Cache-Control':'no-store'}});
}
