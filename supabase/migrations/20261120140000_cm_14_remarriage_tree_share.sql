-- वैवाहिक परिचय: (1) पुनर्विवाह का अलग खंड (वैवाहिक स्थिति), (2) वंश वृक्ष दिखाना / माँगना,
-- (3) वंश वृक्ष का साझा-लिंक (दूसरी संस्था वालों को भी दिखाया जा सके)। सब जोड़ने वाला (additive)।

-- =====================================================================
-- 1. वैवाहिक स्थिति + वंश वृक्ष दिखाने का तरीका
-- =====================================================================
alter table public.cm_matrimony_profiles
  add column if not exists marital_status text not null default 'never',
  add column if not exists tree_share text not null default 'ask';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cm_matri_marital_chk') then
    alter table public.cm_matrimony_profiles add constraint cm_matri_marital_chk check (marital_status in ('never', 'widowed', 'divorced', 'separated'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cm_matri_tree_share_chk') then
    alter table public.cm_matrimony_profiles add constraint cm_matri_tree_share_chk check (tree_share in ('off', 'ask', 'open'));
  end if;
end $$;
grant select (marital_status, tree_share), insert (marital_status, tree_share), update (marital_status, tree_share) on public.cm_matrimony_profiles to authenticated;

-- वंश वृक्ष माँगने के अनुरोध
create table if not exists public.cm_matrimony_tree_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.cm_matrimony_profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (profile_id, user_id)
);
alter table public.cm_matrimony_tree_requests enable row level security;
revoke all on public.cm_matrimony_tree_requests from anon, authenticated;

-- परिचय-सूची के साथ जोड़ने के लिए: वैवाहिक स्थिति, वंश वृक्ष है या नहीं, मेरा अनुरोध
create or replace function public.k1_matrimony_meta(p_org uuid)
returns table (id uuid, marital_status text, has_tree boolean, tree_share text, my_request text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.marital_status,
         p.family_id is not null and p.tree_share <> 'off' and exists (select 1 from public.families f where f.id = p.family_id and f.status <> 'deleted'),
         p.tree_share,
         (select r.status from public.cm_matrimony_tree_requests r where r.profile_id = p.id and r.user_id = auth.uid())
    from public.cm_matrimony_profiles p
   where p.organization_id = p_org and p.status = 'active' and p.verified_at is not null and public.k1_is_member(p_org);
$$;
revoke all on function public.k1_matrimony_meta(uuid) from public, anon;
grant execute on function public.k1_matrimony_meta(uuid) to authenticated;

-- एक परिवार का वृक्ष, बिना मोबाइल नंबर और बिना जन्म तिथि (अंदर के काम के लिए)
create or replace function public.shok_tree_json(p_family uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('family_name', f.family_name, 'gotra', f.gotra, 'kuldevi', f.kuldevi,
           'village', (select v.name from public.villages v where v.id = f.village_id),
           'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'parent_id', m.parent_id, 'name', m.name, 'is_head', m.is_head, 'sort_order', m.sort_order,
                         'is_deceased', m.is_deceased, 'name_unknown', m.name_unknown, 'member_kind', m.member_kind, 'native_place', m.native_place,
                         'village_name', (select v.name from public.villages v where v.id = coalesce(m.village_id, f.village_id))) order by m.sort_order, m.created_at)
                       from public.members m where m.family_id = f.id), '[]'::jsonb))
    from public.families f where f.id = p_family and f.status <> 'deleted';
$$;
revoke all on function public.shok_tree_json(uuid) from public, anon, authenticated;

create or replace function public.k1_matrimony_tree_request(p_profile uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare p public.cm_matrimony_profiles; st text; me text;
begin
  select * into p from public.cm_matrimony_profiles where id = p_profile and status = 'active' and verified_at is not null;
  if p.id is null then raise exception 'Profile not available'; end if;
  if not public.k1_is_member(p.organization_id) then raise exception 'Members only'; end if;
  if p.user_id = auth.uid() then raise exception 'This is your own profile'; end if;
  if p.family_id is null or p.tree_share = 'off' then raise exception 'इस परिचय के साथ वंश वृक्ष नहीं जोड़ा गया है'; end if;
  if p.tree_share = 'open' then return 'accepted'; end if;
  select status into st from public.cm_matrimony_tree_requests where profile_id = p_profile and user_id = auth.uid();
  if st is not null then return st; end if;
  if (select count(*) from public.cm_matrimony_tree_requests where user_id = auth.uid() and created_at > now() - interval '1 day') >= 15 then
    raise exception 'आज के लिए बहुत अनुरोध हो गए — कल फिर कोशिश कीजिए';
  end if;
  insert into public.cm_matrimony_tree_requests (profile_id, user_id) values (p_profile, auth.uid());
  begin
    select coalesce((select full_name from public.profiles where id = auth.uid()), 'एक सदस्य') into me;
    perform public.k1_notify_user(p.organization_id, p.user_id, 'वंश वृक्ष देखने का अनुरोध',
      me || ' ने "' || p.display_name || '" के वैवाहिक परिचय के साथ जुड़ा वंश वृक्ष देखने का अनुरोध किया है। स्वीकार या अस्वीकार करने के लिए वैवाहिक → रुचियाँ खोलिए।', '/matrimony', 'cm_matrimony_tree_requests', p_profile);
  exception when others then null;
  end;
  return 'sent';
end $$;
revoke all on function public.k1_matrimony_tree_request(uuid) from public, anon;
grant execute on function public.k1_matrimony_tree_request(uuid) to authenticated;

create or replace function public.k1_matrimony_tree_respond(p_request uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select q.id, q.user_id, p.organization_id, p.display_name into r
    from public.cm_matrimony_tree_requests q join public.cm_matrimony_profiles p on p.id = q.profile_id
   where q.id = p_request and p.user_id = auth.uid();
  if r.id is null then raise exception 'Not allowed'; end if;
  update public.cm_matrimony_tree_requests set status = case when p_accept then 'accepted' else 'declined' end, decided_at = now() where id = p_request;
  if p_accept then
    begin
      perform public.k1_notify_user(r.organization_id, r.user_id, 'वंश वृक्ष देखने की अनुमति मिली',
        '"' || r.display_name || '" के परिचय का वंश वृक्ष अब आप देख सकते हैं — वैवाहिक पन्ने पर उस परिचय में "वंश वृक्ष देखें" दबाइए।', '/matrimony', 'cm_matrimony_tree_requests', p_request);
    exception when others then null;
    end;
  end if;
end $$;
revoke all on function public.k1_matrimony_tree_respond(uuid, boolean) from public, anon;
grant execute on function public.k1_matrimony_tree_respond(uuid, boolean) to authenticated;

-- मेरे परिचयों पर आए अनुरोध
create or replace function public.k1_matrimony_tree_inbox(p_org uuid)
returns table (request_id uuid, profile_name text, requester_name text, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select q.id, p.display_name,
         coalesce((select om.full_name from public.org_memberships om where om.user_id = q.user_id and om.organization_id = p.organization_id limit 1),
                  (select pr.full_name from public.profiles pr where pr.id = q.user_id), 'सदस्य'),
         q.status, q.created_at
    from public.cm_matrimony_tree_requests q join public.cm_matrimony_profiles p on p.id = q.profile_id
   where p.user_id = auth.uid() and p.organization_id = p_org
   order by q.created_at desc;
$$;
revoke all on function public.k1_matrimony_tree_inbox(uuid) from public, anon;
grant execute on function public.k1_matrimony_tree_inbox(uuid) to authenticated;

-- परिचय का वंश वृक्ष: खुद का, "सबको दिखे" वाला, या जिसका अनुरोध स्वीकार हुआ
create or replace function public.k1_matrimony_tree(p_profile uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.shok_tree_json(p.family_id)
    from public.cm_matrimony_profiles p
   where p.id = p_profile and p.family_id is not null
     and (p.user_id = auth.uid()
          or (p.status = 'active' and p.verified_at is not null and p.tree_share <> 'off' and public.k1_is_member(p.organization_id)
              and (p.tree_share = 'open'
                   or exists (select 1 from public.cm_matrimony_tree_requests r where r.profile_id = p.id and r.user_id = auth.uid() and r.status = 'accepted'))));
$$;
revoke all on function public.k1_matrimony_tree(uuid) from public, anon;
grant execute on function public.k1_matrimony_tree(uuid) to authenticated;

-- परिचय के साथ जोड़ने के लिए मेरे वंश वृक्ष: जिनका मैं मालिक हूँ, या जिनमें मेरा नंबर दर्ज है
create or replace function public.k1_matrimony_my_trees()
returns table (id uuid, family_name text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.family_name from public.families f
   where f.kind = 'tree' and f.status <> 'deleted'
     and (f.owner_id = auth.uid()
          or exists (select 1 from public.members m join public.profiles p on p.id = auth.uid()
                      where m.family_id = f.id and coalesce(m.phone, '') <> '' and coalesce(p.phone, '') <> ''
                        and right(regexp_replace(m.phone, '\D', '', 'g'), 10) = right(regexp_replace(p.phone, '\D', '', 'g'), 10)))
   order by f.family_name;
$$;
revoke all on function public.k1_matrimony_my_trees() from public, anon;
grant execute on function public.k1_matrimony_my_trees() to authenticated;

-- परिचय में परिवार जोड़ना (family_id सीधे नहीं बदला जा सकता; सिर्फ़ अपना वृक्ष जोड़ सकते हैं)
create or replace function public.k1_matrimony_set_tree(p_profile uuid, p_family uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.cm_matrimony_profiles where id = p_profile and user_id = auth.uid()) then raise exception 'Not allowed'; end if;
  if p_family is not null and not exists (select 1 from public.k1_matrimony_my_trees() t where t.id = p_family) then
    raise exception 'सिर्फ़ अपना वंश वृक्ष जोड़ा जा सकता है';
  end if;
  update public.cm_matrimony_profiles set family_id = p_family where id = p_profile;
end $$;
revoke all on function public.k1_matrimony_set_tree(uuid, uuid) from public, anon;
grant execute on function public.k1_matrimony_set_tree(uuid, uuid) to authenticated;

-- साझा-पेज (m/<token>) पर वैवाहिक स्थिति भी
do $$
declare d text;
begin
  d := pg_get_functiondef('public.k1_matrimony_public(text)'::regprocedure);
  if position('marital_status' in d) = 0 then
    d := replace(d, '''interests'', p.interests,', '''interests'', p.interests, ''marital_status'', p.marital_status,');
    execute d;
  end if;
end $$;

-- =====================================================================
-- 2. वंश वृक्ष का साझा-लिंक (बिना लॉगिन खुलता है; मालिक जब चाहे बंद कर दे)
-- =====================================================================
create table if not exists public.family_shares (
  token text primary key default lower(replace(gen_random_uuid()::text, '-', '')),
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  views integer not null default 0
);
create index if not exists family_shares_family on public.family_shares (family_id);
alter table public.family_shares enable row level security;
revoke all on public.family_shares from anon, authenticated;

create or replace function public.shok_tree_share_can(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.families f where f.id = p_family and f.status <> 'deleted' and f.kind = 'tree'
                  and (f.owner_id = auth.uid() or public.can_manage_family(f.id)
                       or exists (select 1 from public.k1_matrimony_my_trees() t where t.id = f.id)));
$$;
revoke all on function public.shok_tree_share_can(uuid) from public, anon, authenticated;

-- p_days: कितने दिन चले (null = जब तक बंद न करें)
create or replace function public.shok_tree_share_create(p_family uuid, p_days integer default 30) returns text
language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  if not public.shok_tree_share_can(p_family) then raise exception 'इस वंश वृक्ष को साझा करने की अनुमति नहीं है'; end if;
  if (select count(*) from public.family_shares where family_id = p_family and revoked_at is null and (expires_at is null or expires_at > now())) >= 10 then
    raise exception 'इस वंश वृक्ष के 10 लिंक पहले से चालू हैं — कोई पुराना बंद कीजिए';
  end if;
  insert into public.family_shares (family_id, created_by, expires_at)
  values (p_family, auth.uid(), case when p_days is null then null else now() + make_interval(days => greatest(1, least(p_days, 365))) end)
  returning token into t;
  return t;
end $$;
revoke all on function public.shok_tree_share_create(uuid, integer) from public, anon;
grant execute on function public.shok_tree_share_create(uuid, integer) to authenticated;

create or replace function public.shok_tree_share_list(p_family uuid)
returns table (token text, created_at timestamptz, expires_at timestamptz, views integer)
language sql stable security definer set search_path = '' as $$
  select s.token, s.created_at, s.expires_at, s.views from public.family_shares s
   where s.family_id = p_family and s.revoked_at is null and (s.expires_at is null or s.expires_at > now()) and public.shok_tree_share_can(p_family)
   order by s.created_at desc;
$$;
revoke all on function public.shok_tree_share_list(uuid) from public, anon;
grant execute on function public.shok_tree_share_list(uuid) to authenticated;

create or replace function public.shok_tree_share_revoke(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare fam uuid;
begin
  select family_id into fam from public.family_shares where token = p_token;
  if fam is null or not public.shok_tree_share_can(fam) then raise exception 'अनुमति नहीं है'; end if;
  update public.family_shares set revoked_at = now() where token = p_token;
end $$;
revoke all on function public.shok_tree_share_revoke(text) from public, anon;
grant execute on function public.shok_tree_share_revoke(text) to authenticated;

-- सार्वजनिक: लिंक से वृक्ष (नाम, रिश्ते, गाँव; मोबाइल नंबर / जन्म तिथि कभी नहीं)
create or replace function public.shok_tree_shared(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare fam uuid;
begin
  select s.family_id into fam from public.family_shares s
   where s.token = lower(btrim(p_token)) and s.revoked_at is null and (s.expires_at is null or s.expires_at > now());
  if fam is null then return null; end if;
  update public.family_shares set views = views + 1 where token = lower(btrim(p_token));
  return public.shok_tree_json(fam);
end $$;
revoke all on function public.shok_tree_shared(text) from public;
grant execute on function public.shok_tree_shared(text) to anon, authenticated;
