-- Kalchuri One · Phase 16 · member photos + second WhatsApp number in the family tree, member-facing "my family"
-- view (photo upload, suggestions incl. siblings), matrimony multiple photos + interests/special note,
-- membership photo + organization choice. Additive only (shokpatra tables keep working).

-- ---------- family tree ----------
alter table public.members add column if not exists photo_path text, add column if not exists phone2 text;
alter table public.member_suggestions add column if not exists phone2 text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-photos', 'family-photos', true, 3145728, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;

-- a signed-in user "belongs" to a family when any active membership of theirs points to it, or their shokpatra profile owns it
create or replace function public.k1_in_family(p_family uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_memberships m where m.user_id = auth.uid() and m.status = 'active' and m.family_id = p_family)
      or exists (select 1 from public.families f where f.id = p_family and f.owner_id = auth.uid())
      or public.can_manage_family(p_family);
$$;
grant execute on function public.k1_in_family(uuid) to authenticated;

create policy family_photos_public_read on storage.objects for select using (bucket_id = 'family-photos');
create policy family_photos_write on storage.objects for insert to authenticated with check (bucket_id = 'family-photos' and public.k1_in_family(((storage.foldername(name))[1])::uuid));
create policy family_photos_update on storage.objects for update to authenticated using (bucket_id = 'family-photos' and public.k1_in_family(((storage.foldername(name))[1])::uuid));

-- members of a family may set a member's photo / second number (admins too)
create or replace function public.k1_member_update_contact(p_member uuid, p_photo text default null, p_phone2 text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare fam uuid;
begin
  select family_id into fam from public.members where id = p_member;
  if fam is null or not public.k1_in_family(fam) then raise exception 'Not allowed'; end if;
  update public.members set photo_path = coalesce(p_photo, photo_path), phone2 = coalesce(nullif(p_phone2, ''), phone2) where id = p_member;
end $$;
grant execute on function public.k1_member_update_contact(uuid, text, text) to authenticated;

-- "my family": the family a signed-in member belongs to, with its tree (photos included)
create or replace function public.k1_my_family()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare fam uuid;
begin
  select coalesce(
    (select m.family_id from public.org_memberships m where m.user_id = auth.uid() and m.status = 'active' and m.family_id is not null order by m.decided_at desc nulls last limit 1),
    (select f.id from public.families f where f.owner_id = auth.uid() and f.status <> 'deleted' order by f.created_at limit 1)) into fam;
  if fam is null then return null; end if;
  return jsonb_build_object(
    'family', (select jsonb_build_object('id', f.id, 'family_name', f.family_name, 'status', f.status, 'village', (select v.name from public.villages v where v.id = f.village_id)) from public.families f where f.id = fam),
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'parent_id', m.parent_id, 'name', m.name, 'relation', m.relation, 'is_head', m.is_head, 'sort_order', m.sort_order,
                   'native_place', m.native_place, 'village_name', (select v.name from public.villages v where v.id = coalesce(m.village_id, (select f.village_id from public.families f where f.id = fam))),
                   'is_deceased', m.is_deceased, 'name_unknown', m.name_unknown, 'member_kind', m.member_kind, 'photo_path', m.photo_path, 'phone', m.phone, 'phone2', m.phone2) order by m.sort_order)
                 from public.members m where m.family_id = fam), '[]'::jsonb),
    'can_edit', public.can_manage_family(fam));
end $$;
grant execute on function public.k1_my_family() to authenticated;

-- active Kalchuri One members may use the shokpatra "suggest a name" flow (siblings = same parent)
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
      or core.has_perm_anywhere('family.manage')
      or exists (select 1 from public.org_memberships m where m.user_id = auth.uid() and m.status = 'active');
$$;

-- ---------- matrimony: several photos, interests, special note ----------
alter table public.cm_matrimony_profiles
  add column if not exists photos text[] not null default '{}',
  add column if not exists interests text,
  add column if not exists special_note text;
grant select (photos, interests, special_note) on public.cm_matrimony_profiles to authenticated;
drop function if exists public.k1_matrimony_browse(uuid, text);
create or replace function public.k1_matrimony_browse(p_org uuid, p_gender text default null)
returns table (id uuid, display_name text, gender text, age int, height_cm int, education text, profession text, income_range text, city text, district text, gotra text, native_place text, about text, expectations text, photo_path text, created_for text, verified boolean, my_interest text, their_interest text, photos text[], interests text, special_note text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.gender, extract(year from current_date)::int - p.birth_year, p.height_cm, p.education, p.profession, p.income_range, p.city, p.district, p.gotra, p.native_place, p.about, p.expectations, p.photo_path, p.created_for, p.verified_at is not null,
         (select i.status from public.cm_matrimony_interests i join public.cm_matrimony_profiles mine on mine.id = i.from_profile where mine.user_id = auth.uid() and i.to_profile = p.id limit 1),
         (select i.status from public.cm_matrimony_interests i join public.cm_matrimony_profiles mine on mine.id = i.to_profile where mine.user_id = auth.uid() and i.from_profile = p.id limit 1),
         p.photos, p.interests, p.special_note
    from public.cm_matrimony_profiles p
   where p.organization_id = p_org and p.status = 'active' and p.verified_at is not null and p.user_id <> auth.uid()
     and (p_gender is null or p.gender = p_gender)
     and public.k1_is_member(p_org)
   order by p.verified_at desc;
$$;
grant execute on function public.k1_matrimony_browse(uuid, text) to authenticated;

