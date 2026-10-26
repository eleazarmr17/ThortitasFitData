-- Run once in a NEW Supabase project. Existing Sites data is not modified.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table private.allowed_emails (
  email text primary key check(email=lower(email)),
  slot smallint not null unique check(slot in (1,2))
);
alter table private.allowed_emails enable row level security;
revoke all on private.allowed_emails from public,anon,authenticated;

-- Authorisation uses verified Auth data, never editable user metadata.
-- The current session must still exist, so logout revokes data access.
create function private.is_allowed(target uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists(select 1 from auth.sessions s where s.id=(auth.jwt()->>'session_id')::uuid and s.user_id=auth.uid())
    and exists(select 1 from auth.users u join private.allowed_emails a on a.email=lower(u.email)
      where u.id=target and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false));
$$;
revoke all on function private.is_allowed(uuid) from public,anon;
grant execute on function private.is_allowed(uuid) to authenticated;
create function public.can_access_app() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.is_allowed(); $$;
revoke all on function public.can_access_app() from public,anon;
grant execute on function public.can_access_app() to authenticated;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check(length(name) between 1 and 120),
  email text not null,
  profile jsonb not null default '{}' check(jsonb_typeof(profile)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.users enable row level security;
grant select,insert,update on public.users to authenticated;
revoke all on public.users from anon;
create policy users_read on public.users for select to authenticated using ((select private.is_allowed()) and private.is_allowed(id));
create policy users_create on public.users for insert to authenticated with check ((select private.is_allowed()) and id=(select auth.uid()));
create policy users_update on public.users for update to authenticated using ((select private.is_allowed()) and id=(select auth.uid())) with check ((select private.is_allowed()) and id=(select auth.uid()));

do $$ declare t text; begin
  foreach t in array array['routines','sessions','daily_steps','body_weights','goals','challenges','posts'] loop
    execute format('create table public.%I (
      id text primary key default gen_random_uuid()::text,
      user_id uuid not null references public.users(id) on delete cascade,
      data jsonb not null check(jsonb_typeof(data)=''object''),
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )',t);
    execute format('create index on public.%I(user_id,created_at desc,id)',t);
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy shared_read on public.%I for select to authenticated using ((select private.is_allowed()) and private.is_allowed(user_id))',t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check ((select private.is_allowed()) and user_id=(select auth.uid()))',t);
    execute format('create policy own_update on public.%I for update to authenticated using ((select private.is_allowed()) and user_id=(select auth.uid())) with check ((select private.is_allowed()) and user_id=(select auth.uid()))',t);
    execute format('create policy own_delete on public.%I for delete to authenticated using ((select private.is_allowed()) and user_id=(select auth.uid()))',t);
  end loop;
end $$;
alter table public.daily_steps add column date date not null;
alter table public.daily_steps add constraint daily_steps_user_date unique(user_id,date);

create table public.post_likes (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(), unique(post_id,user_id)
);
create table public.post_comments (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null check(length(text) between 1 and 3000),
  created_at timestamptz not null default now()
);
create table public.challenge_contributions (
  id text not null unique default gen_random_uuid()::text,
  challenge_id text not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  current numeric not null check(current between 0 and 100000000),
  created_at timestamptz not null default now(), primary key(challenge_id,user_id)
);
do $$ declare t text; begin
  foreach t in array array['post_likes','post_comments','challenge_contributions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create index on public.%I(user_id)',t);
    execute format('create policy shared_read on public.%I for select to authenticated using ((select private.is_allowed()) and private.is_allowed(user_id))',t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check ((select private.is_allowed()) and user_id=(select auth.uid()))',t);
    execute format('create policy own_update on public.%I for update to authenticated using ((select private.is_allowed()) and user_id=(select auth.uid())) with check ((select private.is_allowed()) and user_id=(select auth.uid()))',t);
    execute format('create policy own_delete on public.%I for delete to authenticated using ((select private.is_allowed()) and user_id=(select auth.uid()))',t);
  end loop;
end $$;
create index on public.post_likes(post_id);
create index on public.post_comments(post_id,created_at);
create index on public.challenge_contributions(challenge_id);

create table public.favorites (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check(kind in ('recipe','exercise')), target_id text not null,
  recipe_id text generated always as (case when kind='recipe' then target_id else null end) stored references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(), unique(user_id,kind,target_id)
);
alter table public.favorites enable row level security;
revoke all on public.favorites from anon;
grant select,insert,update,delete on public.favorites to authenticated;
create policy own_favorites on public.favorites for all to authenticated using ((select private.is_allowed()) and user_id=(select auth.uid())) with check ((select private.is_allowed()) and user_id=(select auth.uid()));
create index on public.favorites(recipe_id);

create table public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid not null references public.users(id) on delete cascade,
  text text not null check(length(text) between 1 and 1000), read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
grant select,insert on public.notifications to authenticated;
grant update(read) on public.notifications to authenticated;
create index on public.notifications(user_id,created_at desc);
create index on public.notifications(actor_id);
create policy notifications_read on public.notifications for select to authenticated using ((select private.is_allowed()) and user_id=(select auth.uid()));
create policy notifications_create on public.notifications for insert to authenticated with check ((select private.is_allowed()) and actor_id=(select auth.uid()) and private.is_allowed(user_id));
create policy notifications_update on public.notifications for update to authenticated using ((select private.is_allowed()) and user_id=(select auth.uid())) with check ((select private.is_allowed()) and user_id=(select auth.uid()));

create table public.media (
  key uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  storage_path text not null unique check(storage_path=user_id::text||'/'||key::text),
  content_type text not null check(content_type in ('image/jpeg','image/png','image/webp','image/gif')),
  created_at timestamptz not null default now()
);
alter table public.media enable row level security;
revoke all on public.media from anon;
grant select,insert,delete on public.media to authenticated;
create index on public.media(user_id);
create policy media_read on public.media for select to authenticated using ((select private.is_allowed()) and private.is_allowed(user_id));
create policy media_insert on public.media for insert to authenticated with check ((select private.is_allowed()) and user_id=(select auth.uid()));
create policy media_delete on public.media for delete to authenticated using ((select private.is_allowed()) and user_id=(select auth.uid()));

-- Immutable IDs and dates keep historical ordering stable, including upserts.
create function private.preserve_record() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at
     or (to_jsonb(new)->>'user_id') is distinct from (to_jsonb(old)->>'user_id') then
    raise exception 'Record ownership and creation time cannot change' using errcode='42501';
  end if;
  if to_jsonb(new) ? 'updated_at' then new.updated_at=now(); end if;
  return new;
end $$;
revoke all on function private.preserve_record() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['users','routines','sessions','daily_steps','body_weights','goals','challenges','posts','post_likes','post_comments','challenge_contributions','favorites'] loop
    execute format('create trigger preserve_record before update on public.%I for each row execute function private.preserve_record()',t);
  end loop;
end $$;

create function public.bootstrap_profile(p_name text,p_email text) returns void
language plpgsql security invoker set search_path='' as $$
declare routine_name text; begin
  if not private.is_allowed() then raise exception 'Access denied' using errcode='42501'; end if;
  insert into public.users(id,name,email,profile) values(auth.uid(),left(p_name,120),p_email,'{"weeklyTarget":4,"stepTarget":10000}') on conflict(id) do nothing;
  if not found then return; end if;
  foreach routine_name in array array['Upper Body 1','Lower Body 1','Upper Body 2','Lower Body 2'] loop
    insert into public.routines(id,user_id,data) values('initial:'||auth.uid()::text||':'||replace(routine_name,' ','-'),auth.uid(),jsonb_build_object('name',routine_name,'category',routine_name,'notes','','exercises','[]'::jsonb)) on conflict(id) do nothing;
  end loop;
end $$;
revoke all on function public.bootstrap_profile(text,text) from public,anon;
grant execute on function public.bootstrap_profile(text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fitness-photos','fitness-photos',false,3145728,array['image/jpeg','image/png','image/webp','image/gif']);
create policy fitness_photo_read on storage.objects for select to authenticated using (bucket_id='fitness-photos' and (select private.is_allowed()) and exists(select 1 from public.users u where u.id::text=split_part(storage.objects.name,'/',1)));
create policy fitness_photo_insert on storage.objects for insert to authenticated with check (bucket_id='fitness-photos' and (select private.is_allowed()) and split_part(storage.objects.name,'/',1)=(select auth.uid())::text);
create policy fitness_photo_delete on storage.objects for delete to authenticated using (bucket_id='fitness-photos' and (select private.is_allowed()) and split_part(storage.objects.name,'/',1)=(select auth.uid())::text);
commit;

-- After setup, insert ONLY your two approved email addresses into
-- private.allowed_emails(email,slot), and create both verified Auth accounts
-- in the dashboard. Disable public signups. No demo records are created.
