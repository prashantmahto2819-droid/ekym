-- Kalchuri One · Phase 11 · community: listings (business / jobs / scholarships / professionals / emergency help),
-- matrimony (consent + mutual-interest contact reveal), internal polls.

-- permissions for the new modules
insert into core.permissions(key, module, label, label_hi) values
  ('community.listing.moderate','community','Moderate directory, jobs, scholarships and help listings','निर्देशिका / रोज़गार / छात्रवृत्ति / सहायता सूचियाँ संभालना'),
  ('community.matrimony.manage','community','Verify matrimony profiles','वैवाहिक प्रोफ़ाइल सत्यापित करना'),
  ('community.poll.manage','community','Create and close polls','मतदान बनाना और बंद करना')
on conflict (key) do nothing;

-- active member of an organization (for member-only features)
create or replace function public.k1_is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_org_team(p_org) or exists (select 1 from public.org_memberships m where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active');
$$;
grant execute on function public.k1_is_member(uuid) to authenticated;

-- ---------- listings ----------
create table public.cm_listings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  kind text not null check (kind in ('business','job','scholarship','professional','emergency')),
  title text not null, title_hi text,
  body text, body_hi text,
  category text,                                   -- shop type / job field / profession / help type
  fields jsonb not null default '{}'::jsonb,       -- kind-specific: {salary, last_date, eligibility, amount, qualification, experience, blood_group…}
  contact_name text, phone text, email text, website text,
  address text, city text, district text, state text,
  image text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  featured boolean not null default false,
  expires_at date,
  submitted_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz, admin_note text,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.cm_listings(organization_id, kind, status);
create trigger trg_cm_listings_updated before update on public.cm_listings for each row execute function public.set_updated_at();
alter table public.cm_listings enable row level security;
create policy cm_listings_public_read on public.cm_listings for select using (status = 'approved' and (expires_at is null or expires_at >= current_date));
create policy cm_listings_own_read on public.cm_listings for select to authenticated using (submitted_by = auth.uid());
create policy cm_listings_insert on public.cm_listings for insert to authenticated with check (submitted_by = auth.uid() and status = 'pending');
create policy cm_listings_own_update on public.cm_listings for update to authenticated using (submitted_by = auth.uid() and status in ('pending','rejected')) with check (submitted_by = auth.uid() and status = 'pending');
create policy cm_listings_moderate on public.cm_listings for all to authenticated
  using (core.can(organization_id, 'community.listing.moderate')) with check (core.can(organization_id, 'community.listing.moderate'));
grant select on public.cm_listings to anon, authenticated;
grant insert, update, delete on public.cm_listings to authenticated;

create or replace function public.k1_listing_decide(p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  select organization_id into org from public.cm_listings where id = p_id;
  if org is null or not core.can(org, 'community.listing.moderate') then raise exception 'Not allowed'; end if;
  if p_status not in ('approved','rejected','expired') then raise exception 'Bad status'; end if;
  update public.cm_listings set status = p_status, decided_by = auth.uid(), decided_at = now(), admin_note = p_note where id = p_id;
end $$;
grant execute on function public.k1_listing_decide(uuid, text, text) to authenticated;

create or replace function public.k1_listing_view(p_id uuid)
returns void language sql security definer set search_path = '' as $$ update public.cm_listings set views = views + 1 where id = p_id and status = 'approved'; $$;
grant execute on function public.k1_listing_view(uuid) to anon, authenticated;

-- ---------- matrimony (members only; contact only on mutual interest) ----------
create table public.cm_matrimony_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_for text not null default 'self' check (created_for in ('self','son','daughter','brother','sister','relative')),
  display_name text not null,                      -- shown publicly (first name / initials are fine)
  gender text not null check (gender in ('male','female')),
  birth_year int not null check (birth_year between 1940 and extract(year from current_date)::int - 18),   -- adults only
  height_cm int, education text, profession text, income_range text,
  city text, district text, state text,
  gotra text, native_place text, family_id uuid references public.families(id) on delete set null,
  about text, expectations text,
  photo_path text,                                 -- storage: matrimony/<org>/<profile>.jpg (members only)
  contact_phone text not null,                     -- revealed only on mutual interest
  consent_at timestamptz not null default now(),   -- consent to show the profile to members
  verified_at timestamptz, verified_by uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active','paused','matched','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, created_for, display_name)
);
create index on public.cm_matrimony_profiles(organization_id, status, gender);
create trigger trg_cm_matri_updated before update on public.cm_matrimony_profiles for each row execute function public.set_updated_at();

create table public.cm_matrimony_interests (
  id uuid primary key default gen_random_uuid(),
  from_profile uuid not null references public.cm_matrimony_profiles(id) on delete cascade,
  to_profile uuid not null references public.cm_matrimony_profiles(id) on delete cascade,
  status text not null default 'sent' check (status in ('sent','accepted','declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (from_profile, to_profile),
  check (from_profile <> to_profile)
);
alter table public.cm_matrimony_profiles enable row level security;
alter table public.cm_matrimony_interests enable row level security;
-- never expose contact_phone through RLS: members read via the RPC below; owners/managers can read rows
create policy cm_matri_own on public.cm_matrimony_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cm_matri_manage on public.cm_matrimony_profiles for all to authenticated using (core.can(organization_id, 'community.matrimony.manage')) with check (core.can(organization_id, 'community.matrimony.manage'));
create policy cm_matri_int_own on public.cm_matrimony_interests for select to authenticated
  using (exists (select 1 from public.cm_matrimony_profiles p where (p.id = from_profile or p.id = to_profile) and p.user_id = auth.uid()));
grant insert, update, delete on public.cm_matrimony_profiles to authenticated;
grant select on public.cm_matrimony_interests to authenticated;
-- column-level select only: contact_phone is never readable directly (see k1_matrimony_contact)
grant select (id, organization_id, user_id, created_for, display_name, gender, birth_year, height_cm, education, profession, income_range, city, district, state, gotra, native_place, family_id, about, expectations, photo_path, consent_at, verified_at, verified_by, status, created_at, updated_at) on public.cm_matrimony_profiles to authenticated;

-- browse: active verified profiles of the org, members only, no phone; includes my interest status with each
create or replace function public.k1_matrimony_browse(p_org uuid, p_gender text default null)
returns table (id uuid, display_name text, gender text, age int, height_cm int, education text, profession text, income_range text, city text, district text, gotra text, native_place text, about text, expectations text, photo_path text, created_for text, verified boolean, my_interest text, their_interest text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.gender, extract(year from current_date)::int - p.birth_year, p.height_cm, p.education, p.profession, p.income_range, p.city, p.district, p.gotra, p.native_place, p.about, p.expectations, p.photo_path, p.created_for, p.verified_at is not null,
         (select i.status from public.cm_matrimony_interests i join public.cm_matrimony_profiles mine on mine.id = i.from_profile where mine.user_id = auth.uid() and i.to_profile = p.id limit 1),
         (select i.status from public.cm_matrimony_interests i join public.cm_matrimony_profiles mine on mine.id = i.to_profile where mine.user_id = auth.uid() and i.from_profile = p.id limit 1)
    from public.cm_matrimony_profiles p
   where p.organization_id = p_org and p.status = 'active' and p.verified_at is not null and p.user_id <> auth.uid()
     and (p_gender is null or p.gender = p_gender)
     and public.k1_is_member(p_org)
   order by p.verified_at desc;
$$;
grant execute on function public.k1_matrimony_browse(uuid, text) to authenticated;

create or replace function public.k1_matrimony_interest(p_from uuid, p_to uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.cm_matrimony_profiles where id = p_from and user_id = auth.uid() and status = 'active' and verified_at is not null) then raise exception 'Your profile must be verified first'; end if;
  if not exists (select 1 from public.cm_matrimony_profiles where id = p_to and status = 'active' and verified_at is not null) then raise exception 'Profile not available'; end if;
  insert into public.cm_matrimony_interests(from_profile, to_profile) values (p_from, p_to) on conflict do nothing;
end $$;
grant execute on function public.k1_matrimony_interest(uuid, uuid) to authenticated;

create or replace function public.k1_matrimony_respond(p_interest uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.cm_matrimony_interests i set status = case when p_accept then 'accepted' else 'declined' end, decided_at = now()
   where i.id = p_interest and exists (select 1 from public.cm_matrimony_profiles p where p.id = i.to_profile and p.user_id = auth.uid());
  if not found then raise exception 'Not allowed'; end if;
end $$;
grant execute on function public.k1_matrimony_respond(uuid, boolean) to authenticated;

-- contact of the other side, only when an interest between the two profiles is accepted (either direction)
create or replace function public.k1_matrimony_contact(p_profile uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('display_name', p.display_name, 'contact_phone', p.contact_phone)
    from public.cm_matrimony_profiles p
   where p.id = p_profile and exists (
     select 1 from public.cm_matrimony_interests i join public.cm_matrimony_profiles mine on (mine.id = i.from_profile or mine.id = i.to_profile)
      where mine.user_id = auth.uid() and i.status = 'accepted' and ((i.from_profile = p.id and mine.id = i.to_profile) or (i.to_profile = p.id and mine.id = i.from_profile)));
$$;
grant execute on function public.k1_matrimony_contact(uuid) to authenticated;

-- my inbox: interests I received / sent
create or replace function public.k1_matrimony_inbox(p_org uuid)
returns table (interest_id uuid, direction text, status text, other_id uuid, other_name text, other_age int, other_city text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, case when mine.id = i.from_profile then 'sent' else 'received' end, i.status, o.id, o.display_name, extract(year from current_date)::int - o.birth_year, o.city, i.created_at
    from public.cm_matrimony_interests i
    join public.cm_matrimony_profiles mine on (mine.id = i.from_profile or mine.id = i.to_profile) and mine.user_id = auth.uid() and mine.organization_id = p_org
    join public.cm_matrimony_profiles o on o.id = case when mine.id = i.from_profile then i.to_profile else i.from_profile end
   order by i.created_at desc;
$$;
grant execute on function public.k1_matrimony_inbox(uuid) to authenticated;

create or replace function public.k1_matrimony_verify(p_id uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  select organization_id into org from public.cm_matrimony_profiles where id = p_id;
  if org is null or not core.can(org, 'community.matrimony.manage') then raise exception 'Not allowed'; end if;
  update public.cm_matrimony_profiles set verified_at = case when p_verified then now() end, verified_by = case when p_verified then auth.uid() end where id = p_id;
end $$;
grant execute on function public.k1_matrimony_verify(uuid, boolean) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('matrimony', 'matrimony', false, 5242880, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy matrimony_read on storage.objects for select to authenticated using (bucket_id = 'matrimony' and public.k1_is_member(((storage.foldername(name))[1])::uuid));
create policy matrimony_write on storage.objects for insert to authenticated with check (bucket_id = 'matrimony' and public.k1_is_member(((storage.foldername(name))[1])::uuid));
create policy matrimony_update on storage.objects for update to authenticated using (bucket_id = 'matrimony' and public.k1_is_member(((storage.foldername(name))[1])::uuid));

-- ---------- polls (members vote once; results after close or when open_results) ----------
create table public.cm_polls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  question text not null, question_hi text,
  description text,
  options jsonb not null default '[]'::jsonb,      -- [{key, label, label_hi}]
  audience text not null default 'members' check (audience in ('members','team','public')),
  anonymous boolean not null default true,
  open_results boolean not null default false,     -- show live results before closing
  multi boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'open' check (status in ('draft','open','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.cm_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.cm_polls(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  choices text[] not null,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);
alter table public.cm_polls enable row level security;
alter table public.cm_votes enable row level security;
create policy cm_polls_read on public.cm_polls for select using (status in ('open','closed') and (audience = 'public' or (auth.uid() is not null and (audience = 'members' and public.k1_is_member(organization_id) or audience = 'team' and core.is_org_team(organization_id)))));
create policy cm_polls_manage on public.cm_polls for all to authenticated using (core.can(organization_id, 'community.poll.manage')) with check (core.can(organization_id, 'community.poll.manage'));
create policy cm_votes_own on public.cm_votes for select to authenticated using (voter_id = auth.uid());
grant select on public.cm_polls to anon, authenticated;
grant insert, update, delete on public.cm_polls to authenticated;
grant select on public.cm_votes to authenticated;

create or replace function public.k1_vote(p_poll uuid, p_choices text[])
returns void language plpgsql security definer set search_path = '' as $$
declare p public.cm_polls; ok boolean;
begin
  select * into p from public.cm_polls where id = p_poll;
  if p is null or p.status <> 'open' or (p.ends_at is not null and p.ends_at < now()) or p.starts_at > now() then raise exception 'Poll is not open'; end if;
  ok := case p.audience when 'public' then auth.uid() is not null when 'members' then public.k1_is_member(p.organization_id) else core.is_org_team(p.organization_id) end;
  if not ok then raise exception 'You are not eligible to vote in this poll'; end if;
  if array_length(p_choices, 1) is null or (not p.multi and array_length(p_choices, 1) > 1) then raise exception 'Choose one option'; end if;
  if exists (select 1 from unnest(p_choices) c where not exists (select 1 from jsonb_array_elements(p.options) o where o->>'key' = c)) then raise exception 'Invalid option'; end if;
  insert into public.cm_votes(poll_id, voter_id, choices) values (p_poll, auth.uid(), p_choices);
exception when unique_violation then raise exception 'You have already voted';
end $$;
grant execute on function public.k1_vote(uuid, text[]) to authenticated;

create or replace function public.k1_poll_results(p_poll uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when p.status = 'closed' or p.open_results or core.can(p.organization_id, 'community.poll.manage')
    then jsonb_build_object('total', (select count(*) from public.cm_votes v where v.poll_id = p.id),
           'counts', (select coalesce(jsonb_object_agg(c, n), '{}'::jsonb) from (select c, count(*) n from public.cm_votes v, unnest(v.choices) c where v.poll_id = p.id group by c) x),
           'voters', case when p.anonymous then null else (select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(m.full_name, 'member'), 'choices', v.choices)), '[]'::jsonb) from public.cm_votes v left join public.org_memberships m on m.user_id = v.voter_id and m.organization_id = p.organization_id where v.poll_id = p.id) end)
    else jsonb_build_object('total', (select count(*) from public.cm_votes v where v.poll_id = p.id), 'hidden', true) end
    from public.cm_polls p where p.id = p_poll;
$$;
grant execute on function public.k1_poll_results(uuid) to anon, authenticated;

create or replace function public.k1_poll_close(p_poll uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  select organization_id into org from public.cm_polls where id = p_poll;
  if org is null or not core.can(org, 'community.poll.manage') then raise exception 'Not allowed'; end if;
  update public.cm_polls set status = 'closed', ends_at = coalesce(ends_at, now()) where id = p_poll;
end $$;
grant execute on function public.k1_poll_close(uuid) to authenticated;
