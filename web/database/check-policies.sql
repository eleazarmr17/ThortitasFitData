-- Synthetic fixtures run inside a transaction and are rolled back.
-- Run as the project administrator in a development/test project.
begin;
delete from private.allowed_emails;
insert into private.allowed_emails(email,slot) values ('qa-owner@thortitas.invalid',1),('qa-partner@thortitas.invalid',2);
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('10000000-0000-4000-8000-000000000001','qa-owner@thortitas.invalid',now(),false),
('10000000-0000-4000-8000-000000000002','qa-partner@thortitas.invalid',now(),false),
('10000000-0000-4000-8000-000000000003','qa-outsider@thortitas.invalid',now(),false);
insert into auth.sessions(id,user_id) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"20000000-0000-4000-8000-000000000001"}',true);
select public.bootstrap_profile('QA Owner','qa-owner@thortitas.invalid');
insert into public.sessions(id,user_id,data) values('qa-session','10000000-0000-4000-8000-000000000001','{"name":"Original session"}');
insert into public.posts(id,user_id,data) values('qa-post','10000000-0000-4000-8000-000000000001','{"type":"activity","caption":"QA"}');
insert into public.challenges(id,user_id,data) values('qa-challenge','10000000-0000-4000-8000-000000000001','{"type":"custom"}');
insert into public.challenge_contributions(challenge_id,user_id,current) values('qa-challenge','10000000-0000-4000-8000-000000000001',10);
insert into public.daily_steps(user_id,date,data) values('10000000-0000-4000-8000-000000000001','2026-10-26','{"steps":1000}');
insert into public.daily_steps(user_id,date,data) values('10000000-0000-4000-8000-000000000001','2026-10-26','{"steps":1200}') on conflict(user_id,date) do update set data=excluded.data;
insert into storage.objects(bucket_id,name) values('fitness-photos','10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"20000000-0000-4000-8000-000000000002"}',true);
select public.bootstrap_profile('QA Partner','qa-partner@thortitas.invalid');
do $$ declare changed integer; begin
  if not public.can_access_app() then raise exception 'Partner should have access'; end if;
  if (select count(*) from public.users)<>2 then raise exception 'Both profiles must be visible'; end if;
  if (select count(*) from public.sessions where id='qa-session')<>1 then raise exception 'Shared workout read failed'; end if;
  update public.sessions set data='{"name":"Not permitted"}' where id='qa-session';
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'Partner edited another account'; end if;
  begin
    insert into public.sessions(user_id,data) values('10000000-0000-4000-8000-000000000001','{}');
    raise exception 'Partner inserted another account record';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.daily_steps)<>1 then raise exception 'Step upsert duplicated a day'; end if;
  if (select data->>'steps' from public.daily_steps limit 1)<>'1200' then raise exception 'Step correction failed'; end if;
  if (select count(*) from storage.objects where bucket_id='fitness-photos')<>1 then raise exception 'Partner photo access failed'; end if;
end $$;
insert into public.challenge_contributions(challenge_id,user_id,current) values('qa-challenge','10000000-0000-4000-8000-000000000002',20);
update public.challenge_contributions set current=21 where user_id=auth.uid();
insert into public.post_likes(post_id,user_id) values('qa-post',auth.uid());
insert into public.post_comments(post_id,user_id,text) values('qa-post',auth.uid(),'A partner comment');
do $$ begin
  if (select sum(current) from public.challenge_contributions)<>31 then raise exception 'Contributions overwrote another participant'; end if;
  begin
    update public.challenge_contributions set user_id='10000000-0000-4000-8000-000000000001' where user_id=auth.uid();
    raise exception 'Ownership transfer succeeded';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","session_id":"20000000-0000-4000-8000-000000000003"}',true);
do $$ begin
  if public.can_access_app() then raise exception 'Outsider granted access'; end if;
  if (select count(*) from public.users)<>0 or (select count(*) from public.sessions)<>0 then raise exception 'Outsider read private records'; end if;
  if (select count(*) from storage.objects where bucket_id='fitness-photos')<>0 then raise exception 'Outsider read private photos'; end if;
  begin perform public.bootstrap_profile('Outsider','qa-outsider@thortitas.invalid'); raise exception 'Outsider created a profile'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin perform count(*) from public.sessions; raise exception 'Anonymous data access'; exception when insufficient_privilege then null; end;
  begin perform public.can_access_app(); raise exception 'Anonymous RPC access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'All policy checks passed; test records are rolled back.' as result;
rollback;