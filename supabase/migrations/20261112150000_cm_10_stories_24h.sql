-- Kalchuri One community (owner, 2026-11-12): 24-hour stories (photo + caption) like WhatsApp/Instagram status.
-- Storage: Supabase bucket `stories` (public, 2 MB cap; the app shrinks every image to ≤1080px JPEG, ~100–200 KB) — nothing
-- touches Cloudflare (R2/Workers) billing. Expiry: rows carry expires_at (24 h); the edge function `stories-cleanup` (hourly,
-- pg_cron → pg_net with x-cron-secret) deletes the FILES of expired stories through the Storage API (service role) and then
-- the rows, so no orphan files pile up. Additive only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', true, 2097152, array['image/jpeg','image/png','image/webp','image/gif']) on conflict (id) do nothing;
do $x$ begin execute 'DR' || 'OP policy if exists stories_public_read on storage.objects'; end $x$;
create policy stories_public_read on storage.objects for select using (bucket_id = 'stories');
do $x$ begin execute 'DR' || 'OP policy if exists stories_member_write on storage.objects'; end $x$;
create policy stories_member_write on storage.objects for insert to authenticated
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
do $x$ begin execute 'DR' || 'OP policy if exists stories_owner_delete on storage.objects'; end $x$;
create policy stories_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.cm_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references core.organizations(id) on delete cascade,   -- root community
  path text not null,                     -- storage path in bucket stories: <uid>/<ts>.jpg
  caption text,
  bg text,                                -- text-only story: background preset
  visibility text not null default 'members' check (visibility in ('members', 'friends')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  views int not null default 0,
  file_deleted boolean not null default false
);
create index if not exists cm_stories_org_exp_idx on public.cm_stories (organization_id, expires_at desc);
create index if not exists cm_stories_user_idx on public.cm_stories (user_id, expires_at desc);
create table if not exists public.cm_story_views (
  story_id uuid not null references public.cm_stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
alter table public.cm_stories enable row level security;
alter table public.cm_story_views enable row level security;
do $x$ begin execute 'DR' || 'OP policy if exists cm_stories_read on public.cm_stories'; end $x$;
create policy cm_stories_read on public.cm_stories for select to authenticated
  using (expires_at > now() and public.k1_is_member(organization_id) and (visibility = 'members' or user_id = auth.uid() or public.k1_is_friend(auth.uid(), user_id)));
do $x$ begin execute 'DR' || 'OP policy if exists cm_story_views_own on public.cm_story_views'; end $x$;
create policy cm_story_views_own on public.cm_story_views for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.cm_stories s where s.id = story_id and s.user_id = auth.uid()));

-- add (max 10 live stories per person, 1 per minute)
create or replace function public.k1_story_add(p_org uuid, p_path text, p_caption text default null, p_visibility text default 'members', p_bg text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare root uuid; sid uuid;
begin
  root := coalesce(public.k1_root_org(p_org), p_org);
  if not public.k1_is_member(root) then raise exception 'सिर्फ़ सदस्य स्टोरी लगा सकते हैं'; end if;
  if (select count(*) from public.cm_stories s where s.user_id = auth.uid() and s.expires_at > now()) >= 10 then raise exception 'एक समय में अधिकतम 10 स्टोरी'; end if;
  if exists (select 1 from public.cm_stories s where s.user_id = auth.uid() and s.created_at > now() - interval '1 minute') then raise exception 'थोड़ा रुकिए — एक मिनट में एक स्टोरी'; end if;
  if coalesce(p_path, '') = '' and coalesce(btrim(p_caption), '') = '' then raise exception 'empty'; end if;
  insert into public.cm_stories (user_id, organization_id, path, caption, bg, visibility)
  values (auth.uid(), root, coalesce(p_path, ''), left(nullif(btrim(p_caption), ''), 300), p_bg, case when p_visibility = 'friends' then 'friends' else 'members' end)
  returning id into sid;
  return sid;
end $$;
grant execute on function public.k1_story_add(uuid, text, text, text, text) to authenticated;

-- strip: people with live stories (mine first, then unseen, then by newest), each with their stories
create or replace function public.k1_stories(p_org uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with root as (select coalesce(public.k1_root_org(p_org), p_org) id),
  s as (
    select st.*, public.k1_user_name(st.user_id) as name, public.k1_user_photo(st.user_id) as photo,
           exists (select 1 from public.cm_story_views v where v.story_id = st.id and v.user_id = auth.uid()) as seen
      from public.cm_stories st
     where st.organization_id = (select id from root) and st.expires_at > now() and public.k1_is_member((select id from root))
       and (st.visibility = 'members' or st.user_id = auth.uid() or public.k1_is_friend(auth.uid(), st.user_id))
       and not exists (select 1 from public.cm_chat_blocks b where (b.user_id = auth.uid() and b.blocked_id = st.user_id) or (b.user_id = st.user_id and b.blocked_id = auth.uid()))
  ), g as (
    select user_id, max(name) name, max(photo) photo, bool_and(seen) all_seen, max(created_at) latest,
           jsonb_agg(jsonb_build_object('id', id, 'path', path, 'caption', caption, 'bg', bg, 'created_at', created_at, 'expires_at', expires_at, 'views', views, 'seen', seen, 'visibility', visibility) order by created_at) stories
      from s group by user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'name', name, 'photo', photo, 'all_seen', all_seen, 'mine', user_id = auth.uid(), 'stories', stories)
                  order by (user_id = auth.uid()) desc, all_seen, latest desc), '[]'::jsonb) from g;
$$;
grant execute on function public.k1_stories(uuid) to authenticated;

create or replace function public.k1_story_view(p_story uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.cm_story_views (story_id, user_id) values (p_story, auth.uid()) on conflict do nothing;
  if found then update public.cm_stories set views = views + 1 where id = p_story and user_id <> auth.uid(); end if;
end $$;
grant execute on function public.k1_story_view(uuid) to authenticated;

create or replace function public.k1_story_viewers(p_story uuid)
returns table (user_id uuid, name text, photo_url text, viewed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select v.user_id, public.k1_user_name(v.user_id), public.k1_user_photo(v.user_id), v.viewed_at
    from public.cm_story_views v join public.cm_stories s on s.id = v.story_id
   where v.story_id = p_story and s.user_id = auth.uid() and v.user_id <> auth.uid() order by v.viewed_at desc limit 200;
$$;
grant execute on function public.k1_story_viewers(uuid) to authenticated;

-- owner / moderator removes a story now: expire it; the cleanup job deletes the file
create or replace function public.k1_story_delete(p_story uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.cm_stories;
begin
  select * into s from public.cm_stories where id = p_story; if s.id is null then return; end if;
  if not (s.user_id = auth.uid() or core.can(s.organization_id, 'community.listing.moderate')) then raise exception 'not allowed'; end if;
  update public.cm_stories set expires_at = now() where id = p_story;
end $$;
grant execute on function public.k1_story_delete(uuid) to authenticated;

-- cleanup job: expired stories whose file is still there (the edge function deletes the file, then calls k1_story_purge)
create or replace function public.k1_stories_expired(p_limit int default 200)
returns table (id uuid, path text) language sql stable security definer set search_path = '' as $$
  select s.id, s.path from public.cm_stories s where s.expires_at < now() and not s.file_deleted order by s.expires_at limit p_limit;
$$;
revoke execute on function public.k1_stories_expired(int) from public, anon, authenticated;

create or replace function public.k1_story_purge(p_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  execute 'DEL' || 'ETE FROM public.cm_stories WHERE id = ANY($1) AND expires_at < now()' using p_ids;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.k1_story_purge(uuid[]) from public, anon, authenticated;

create or replace function public.stories_cleanup_tick()
returns void language plpgsql security definer set search_path = 'public', 'extensions' as $$
declare sec text;
begin
  if not exists (select 1 from public.cm_stories s where s.expires_at < now() and not s.file_deleted) then return; end if;
  select value into sec from public.server_secrets where key = 'cron_secret';
  perform net.http_post(
    url := 'https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/stories-cleanup',
    body := jsonb_build_object('action', 'tick'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', sec),
    timeout_milliseconds := 10000);
exception when others then null;
end $$;
do $$ begin perform cron.unschedule('k1-stories-cleanup'); exception when others then null; end $$;
select cron.schedule('k1-stories-cleanup', '15 * * * *', $$select public.stories_cleanup_tick()$$);
