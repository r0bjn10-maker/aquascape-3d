-- Run in the Supabase SQL editor as the project owner. No service-role key in the app.
create table if not exists public.aquascape_saves (
  owner uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 0 check (version between 0 and 9007199254740991),
  world jsonb, last_simulated_utc numeric not null default 0,
  updated_at timestamptz not null default now(), device_id uuid,
  check ((version=0 and world is null) or (version>0 and world is not null))
);
create table if not exists public.aquascape_backups (
  owner uuid not null references auth.users(id) on delete cascade,
  version bigint not null, world jsonb not null, created_at timestamptz not null default now(),
  primary key(owner,version)
);
create table if not exists public.aquascape_requests (
  owner uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null, version bigint not null, content_hash text not null,
  created_at timestamptz not null default now(), primary key(owner,request_id)
);
alter table public.aquascape_saves enable row level security;
alter table public.aquascape_backups enable row level security;
alter table public.aquascape_requests enable row level security;
drop policy if exists own_save on public.aquascape_saves;
create policy own_save on public.aquascape_saves for select to authenticated using ((select auth.uid())=owner);
drop policy if exists own_backup on public.aquascape_backups;
create policy own_backup on public.aquascape_backups for select to authenticated using ((select auth.uid())=owner);
-- Requests are internal; even authenticated clients cannot read or mutate the ledger.
revoke all on public.aquascape_saves,public.aquascape_backups,public.aquascape_requests from public,anon,authenticated;
grant select on public.aquascape_saves,public.aquascape_backups to authenticated;

create or replace function public.aquascape_pull() returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_save public.aquascape_saves;
begin
  if actor is null then raise exception 'Authentication required' using errcode='28000'; end if;
  select * into current_save from public.aquascape_saves where owner=actor;
  return jsonb_build_object('save',case when current_save.version>0 then jsonb_build_object('version',current_save.version,'world',current_save.world) else null end,
    'serverUtc',floor(extract(epoch from clock_timestamp())*1000));
end $$;

create or replace function public.aquascape_commit(p_expected_version bigint,p_request_id uuid,p_device_id uuid,p_world jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_save public.aquascape_saves; receipt public.aquascape_requests;
  stamp numeric:=floor(extract(epoch from clock_timestamp())*1000); next_stamp numeric; content text;
begin
  if actor is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_expected_version is null or p_expected_version<0 or p_request_id is null or p_device_id is null then raise exception 'Invalid conditional write'; end if;
  if p_world is null or jsonb_typeof(p_world)<>'object' or octet_length(p_world::text)>2000000
    or p_world->>'version' is distinct from '2' or jsonb_typeof(p_world->'clock') is distinct from 'object'
    or jsonb_typeof(p_world->'terrain') is distinct from 'array'
    or jsonb_typeof(p_world->'objects') is distinct from 'array'
    or jsonb_typeof(p_world->'animals') is distinct from 'array'
    then raise exception 'Invalid world schema or payload size'; end if;
  if jsonb_array_length(p_world->'terrain')<>2145 or jsonb_array_length(p_world->'objects')>240 or jsonb_array_length(p_world->'animals')>80 then raise exception 'Asset limit exceeded'; end if;
  next_stamp:=(p_world->'clock'->>'lastSimulatedUtc')::numeric;
  if next_stamp is null or next_stamp<0 or next_stamp>stamp+300000 then raise exception 'Invalid simulation clock; check device time'; end if;
  content:=encode(sha256(convert_to(p_world::text,'UTF8')),'hex');
  -- INSERT handles the absent-row race; the row lock serializes all writes for this owner.
  insert into public.aquascape_saves(owner) values(actor) on conflict(owner) do nothing;
  select * into current_save from public.aquascape_saves where owner=actor for update;
  select * into receipt from public.aquascape_requests where owner=actor and request_id=p_request_id;
  if found then
    if receipt.content_hash<>content then raise exception 'Request ID reused with a different snapshot'; end if;
    return jsonb_build_object('status','already_applied','version',receipt.version,'serverUtc',stamp);
  end if;
  if current_save.version<>p_expected_version then
    return jsonb_build_object('status','conflict','version',current_save.version,'serverUtc',stamp);
  end if;
  if next_stamp<current_save.last_simulated_utc then raise exception 'Simulation clock regression rejected'; end if;
  if current_save.version>0 then
    insert into public.aquascape_backups(owner,version,world) values(actor,current_save.version,current_save.world) on conflict do nothing;
  end if;
  update public.aquascape_saves set version=current_save.version+1,world=p_world,last_simulated_utc=next_stamp,updated_at=clock_timestamp(),device_id=p_device_id where owner=actor;
  insert into public.aquascape_requests(owner,request_id,version,content_hash) values(actor,p_request_id,current_save.version+1,content);
  delete from public.aquascape_backups where owner=actor and version in (select version from public.aquascape_backups where owner=actor order by version desc offset 20);
  delete from public.aquascape_requests where owner=actor and request_id in (select request_id from public.aquascape_requests where owner=actor order by version desc offset 100);
  return jsonb_build_object('status','applied','version',current_save.version+1,'serverUtc',stamp);
end $$;
revoke all on function public.aquascape_pull() from public,anon;
revoke all on function public.aquascape_commit(bigint,uuid,uuid,jsonb) from public,anon;
grant execute on function public.aquascape_pull(),public.aquascape_commit(bigint,uuid,uuid,jsonb) to authenticated;
