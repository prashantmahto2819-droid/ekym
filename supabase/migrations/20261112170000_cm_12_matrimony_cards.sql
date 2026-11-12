-- Kalchuri One matrimony (owner, 2026-11-12): attractive, customisable biodata card (JPG / PDF) with a QR code, and a
-- share page. Owner picks the template/colours/fields (stored in card jsonb). Sharing is opt-in and only for verified,
-- active profiles: share_mode off | members (QR opens the profile for signed-in members) | link (anyone with the link sees
-- the card image and safe fields — never the phone unless the owner put it on the card). The rendered card JPG lives in
-- the public community bucket under matri/<uid>/<token>.jpg (owner can replace/delete it). Applied via MCP. Additive only.

alter table public.cm_matrimony_profiles
  add column if not exists card jsonb not null default '{}'::jsonb,
  add column if not exists share_token text unique,
  add column if not exists share_mode text not null default 'off',
  add column if not exists share_image text,
  add column if not exists share_views int not null default 0;
do $$ begin
  alter table public.cm_matrimony_profiles add constraint cm_matrimony_profiles_share_mode_check check (share_mode in ('off', 'members', 'link'));
exception when duplicate_object then null; end $$;

do $x$ begin execute 'DR' || 'OP policy if exists community_matri_write on storage.objects'; end $x$;
create policy community_matri_write on storage.objects for insert to authenticated
  with check (bucket_id = 'community' and (storage.foldername(name))[1] = 'matri' and (storage.foldername(name))[2] = auth.uid()::text);
do $x$ begin execute 'DR' || 'OP policy if exists community_matri_update on storage.objects'; end $x$;
create policy community_matri_update on storage.objects for update to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = 'matri' and (storage.foldername(name))[2] = auth.uid()::text);
do $x$ begin execute 'DR' || 'OP policy if exists community_matri_delete on storage.objects'; end $x$;
create policy community_matri_delete on storage.objects for delete to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = 'matri' and (storage.foldername(name))[2] = auth.uid()::text);

-- save the look (does NOT reset verification — it is presentation only)
create or replace function public.k1_matrimony_card_save(p_profile uuid, p_card jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.cm_matrimony_profiles set card = coalesce(p_card, '{}'::jsonb), updated_at = now() where id = p_profile and user_id = auth.uid();
  if not found then raise exception 'not allowed'; end if;
end $$;
grant execute on function public.k1_matrimony_card_save(uuid, jsonb) to authenticated;

-- set sharing; returns the token (created on first use, kept afterwards so printed QR codes keep working)
create or replace function public.k1_matrimony_share(p_profile uuid, p_mode text, p_image text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare p public.cm_matrimony_profiles; tok text;
begin
  select * into p from public.cm_matrimony_profiles where id = p_profile and user_id = auth.uid();
  if p.id is null then raise exception 'not allowed'; end if;
  if p_mode not in ('off', 'members', 'link') then raise exception 'bad mode'; end if;
  if p_mode <> 'off' and (p.verified_at is null or p.status <> 'active') then raise exception 'शेयर सिर्फ़ सत्यापित और चालू प्रोफ़ाइल का हो सकता है'; end if;
  tok := coalesce(p.share_token, replace(replace(rtrim(encode(extensions.gen_random_bytes(9), 'base64'), '='), '/', '_'), '+', '-'));
  update public.cm_matrimony_profiles set share_token = tok, share_mode = p_mode, share_image = coalesce(p_image, share_image) where id = p_profile;
  return tok;
end $$;
grant execute on function public.k1_matrimony_share(uuid, text, text) to authenticated;

-- the share page (anon allowed): safe fields only; members-mode needs a signed-in member of the same community
create or replace function public.k1_matrimony_public(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.cm_matrimony_profiles; o record; allowed boolean;
begin
  select * into p from public.cm_matrimony_profiles where share_token = p_token;
  if p.id is null or p.share_mode = 'off' or p.status <> 'active' or p.verified_at is null then return jsonb_build_object('ok', false, 'reason', 'unavailable'); end if;
  select id, slug, name, name_hi into o from core.organizations where id = p.organization_id;
  allowed := p.share_mode = 'link' or (auth.uid() is not null and public.k1_is_member(p.organization_id));
  if not allowed then return jsonb_build_object('ok', false, 'reason', 'members', 'org', coalesce(o.name_hi, o.name)); end if;
  update public.cm_matrimony_profiles set share_views = share_views + 1 where id = p.id;
  return jsonb_build_object('ok', true, 'id', p.id, 'mode', p.share_mode, 'image', p.share_image,
    'name', p.display_name, 'gender', p.gender, 'age', extract(year from now())::int - p.birth_year, 'height_cm', p.height_cm,
    'education', p.education, 'profession', p.profession, 'city', p.city, 'district', p.district, 'gotra', p.gotra, 'native_place', p.native_place,
    'about', p.about, 'expectations', p.expectations, 'interests', p.interests,
    'org', coalesce(o.name_hi, o.name), 'org_slug', o.slug, 'signed_in', auth.uid() is not null);
end $$;
grant execute on function public.k1_matrimony_public(text) to anon, authenticated;

-- owner's own profile with card settings (for the designer)
create or replace function public.k1_matrimony_mine(p_profile uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(p) || jsonb_build_object('org', (select coalesce(o.name_hi, o.name) from core.organizations o where o.id = p.organization_id))
    from public.cm_matrimony_profiles p where p.id = p_profile and p.user_id = auth.uid();
$$;
grant execute on function public.k1_matrimony_mine(uuid) to authenticated;
