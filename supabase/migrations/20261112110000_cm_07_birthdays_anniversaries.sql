-- Kalchuri One community (owner, 2026-11-12): Facebook-style birthdays + marriage anniversaries.
-- * profile: birthday / anniversary dates with show toggles (birthday defaults from the membership form's dob)
-- * "आज / आने वाले" list for the chat sidebar, the community wall and profiles; one-tap wishes (stored per year, shown on the profile)
-- * every morning (9:00 IST): the celebrant gets a greeting (in-app + WhatsApp/email through the organization's channels),
--   the community wall gets a "🎂 आज X का जन्मदिन है" post from the organization (per-org switch), friends see it in the list.
-- Additive only.

alter table public.cm_user_profiles
  add column if not exists birthday date,
  add column if not exists anniversary date,
  add column if not exists show_birthday boolean not null default true,
  add column if not exists show_birth_year boolean not null default false,
  add column if not exists show_anniversary boolean not null default true;

create table if not exists public.cm_occasion_wishes (
  id uuid primary key default gen_random_uuid(),
  to_user uuid not null references auth.users(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('birthday', 'anniversary')),
  year int not null,
  message text,
  created_at timestamptz not null default now(),
  unique (to_user, from_user, kind, year)
);
alter table public.cm_occasion_wishes enable row level security;
drop policy if exists cm_occasion_wishes_read on public.cm_occasion_wishes;
create policy cm_occasion_wishes_read on public.cm_occasion_wishes for select to authenticated using (true);

alter table public.cm_notifications drop constraint if exists cm_notifications_kind_check;
alter table public.cm_notifications add constraint cm_notifications_kind_check check (kind in ('like','comment','reply','moderation','appeal','mention','chat_dm','birthday','anniversary','wish'));

-- per-organization switches (community settings row)
alter table public.cm_settings
  add column if not exists occasion_posts boolean not null default true,      -- post on the wall as the organization
  add column if not exists occasion_greetings boolean not null default true;  -- WhatsApp/email greeting to the person

-- effective dates: profile value, else the membership form's dob (birthday only)
create or replace function public.k1_user_birthday(p_user uuid)
returns date language sql stable security definer set search_path = '' as $$
  select coalesce((select p.birthday from public.cm_user_profiles p where p.user_id = p_user),
                  (select m.dob from public.org_memberships m where m.user_id = p_user and m.status = 'active' and m.dob is not null order by m.decided_at desc nulls last limit 1));
$$;

-- today's and upcoming occasions among the members the caller can see (root community), with "did I wish already"
create or replace function public.k1_occasions(p_org uuid, p_days int default 7)
returns table (user_id uuid, name text, photo_url text, kind text, on_date date, days_until int, age int, wished boolean, wishes bigint, online boolean, org_names text)
language plpgsql stable security definer set search_path = '' as $$
declare root uuid; today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  root := coalesce(public.k1_root_org(p_org), p_org);
  if not public.k1_is_member(root) then return; end if;
  return query
  with ppl as (
    select distinct m.user_id from public.org_memberships m join core.org_tree t on t.descendant_id = m.organization_id and t.ancestor_id = root
     where m.status = 'active' and m.user_id is not null
  ), occ as (
    select p.user_id, 'birthday'::text as kind, public.k1_user_birthday(p.user_id) as d, coalesce(cp.show_birthday, true) as shown, coalesce(cp.show_birth_year, false) as show_year from ppl p left join public.cm_user_profiles cp on cp.user_id = p.user_id
    union all
    select p.user_id, 'anniversary', cp.anniversary, coalesce(cp.show_anniversary, true), true from ppl p join public.cm_user_profiles cp on cp.user_id = p.user_id where cp.anniversary is not null
  ), nxt as (
    select o.*, (make_date(extract(year from today)::int, extract(month from o.d)::int, least(extract(day from o.d)::int, 28 + case when extract(month from o.d) = 2 then 0 else 3 end))) as this_year from occ o where o.d is not null and o.shown
  ), calc as (
    select n.*, case when n.this_year < today then n.this_year + interval '1 year' else n.this_year end::date as next_date from nxt n
  )
  select c.user_id, public.k1_user_name(c.user_id), public.k1_user_photo(c.user_id), c.kind, c.next_date, (c.next_date - today),
         case when c.show_year or c.kind = 'anniversary' then extract(year from c.next_date)::int - extract(year from c.d)::int end,
         exists (select 1 from public.cm_occasion_wishes w where w.to_user = c.user_id and w.from_user = auth.uid() and w.kind = c.kind and w.year = extract(year from c.next_date)::int),
         (select count(*) from public.cm_occasion_wishes w where w.to_user = c.user_id and w.kind = c.kind and w.year = extract(year from c.next_date)::int),
         (select cp.last_seen_at > now() - interval '2 minutes' from public.cm_user_profiles cp where cp.user_id = c.user_id),
         (select string_agg(distinct coalesce(o.name_hi, o.name), ', ') from public.org_memberships m join core.organizations o on o.id = m.organization_id where m.user_id = c.user_id and m.status = 'active')
    from calc c
   where c.next_date - today <= p_days
   order by (c.next_date - today), 2;
end $$;
grant execute on function public.k1_occasions(uuid, int) to authenticated;

-- one-tap wish: stored for this year, in-app notification (+ nothing else; the person sees it on their profile)
create or replace function public.k1_wish(p_org uuid, p_user uuid, p_kind text, p_message text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare root uuid; yr int := extract(year from (now() at time zone 'Asia/Kolkata'))::int;
begin
  root := coalesce(public.k1_root_org(p_org), p_org);
  if not public.k1_is_member(root) or p_user = auth.uid() then raise exception 'not allowed'; end if;
  if p_kind not in ('birthday', 'anniversary') then raise exception 'bad kind'; end if;
  insert into public.cm_occasion_wishes (to_user, from_user, kind, year, message) values (p_user, auth.uid(), p_kind, yr, left(nullif(btrim(p_message), ''), 300))
  on conflict (to_user, from_user, kind, year) do update set message = excluded.message, created_at = now();
  insert into public.cm_notifications (organization_id, user_id, kind, actor_id, text)
  values (root, p_user, 'wish', auth.uid(), public.k1_user_name(auth.uid()) || case when p_kind = 'birthday' then ' ने जन्मदिन की शुभकामनाएँ दीं' else ' ने वर्षगाँठ की शुभकामनाएँ दीं' end || coalesce(': ' || left(p_message, 120), ''));
end $$;
grant execute on function public.k1_wish(uuid, uuid, text, text) to authenticated;

create or replace function public.k1_wishes_for(p_user uuid, p_year int default null)
returns table (from_user uuid, from_name text, from_photo text, kind text, year int, message text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select w.from_user, public.k1_user_name(w.from_user), public.k1_user_photo(w.from_user), w.kind, w.year, w.message, w.created_at
    from public.cm_occasion_wishes w where w.to_user = p_user and w.year = coalesce(p_year, extract(year from (now() at time zone 'Asia/Kolkata'))::int)
   order by w.created_at desc limit 200;
$$;
grant execute on function public.k1_wishes_for(uuid, int) to authenticated;

-- profile: expose the dates (owner always; others per the toggles)
create or replace function public.k1_profile_occasions(p_user uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'birthday', case when p_user = auth.uid() or coalesce(cp.show_birthday, true) then public.k1_user_birthday(p_user) end,
    'show_birth_year', coalesce(cp.show_birth_year, false),
    'anniversary', case when p_user = auth.uid() or coalesce(cp.show_anniversary, true) then cp.anniversary end,
    'show_birthday', coalesce(cp.show_birthday, true), 'show_anniversary', coalesce(cp.show_anniversary, true))
  from (select 1) x left join public.cm_user_profiles cp on cp.user_id = p_user;
$$;
grant execute on function public.k1_profile_occasions(uuid) to authenticated;

create or replace function public.k1_profile_save_occasions(p_birthday date, p_anniversary date, p_show_birthday boolean, p_show_birth_year boolean, p_show_anniversary boolean)
returns void language sql security definer set search_path = '' as $$
  insert into public.cm_user_profiles as cp (user_id, birthday, anniversary, show_birthday, show_birth_year, show_anniversary, updated_at)
  values (auth.uid(), p_birthday, p_anniversary, coalesce(p_show_birthday, true), coalesce(p_show_birth_year, false), coalesce(p_show_anniversary, true), now())
  on conflict (user_id) do update set birthday = excluded.birthday, anniversary = excluded.anniversary, show_birthday = excluded.show_birthday, show_birth_year = excluded.show_birth_year, show_anniversary = excluded.show_anniversary, updated_at = now();
$$;
grant execute on function public.k1_profile_save_occasions(date, date, boolean, boolean, boolean) to authenticated;

-- the morning job: greet + wall post (runs once per person per occasion per year)
create table if not exists public.cm_occasion_log (
  user_id uuid not null, kind text not null, year int not null, organization_id uuid, post_id uuid, created_at timestamptz not null default now(),
  primary key (user_id, kind, year)
);
alter table public.cm_occasion_log enable row level security;

create or replace function public.k1_occasions_daily()
returns int language plpgsql security definer set search_path = '' as $$
declare today date := (now() at time zone 'Asia/Kolkata')::date; yr int; r record; org record; n int := 0; pid uuid; nm text; greet text; subj text; post_on boolean; greet_on boolean;
begin
  yr := extract(year from today)::int;
  for r in
    with ppl as (select distinct m.user_id, (select m2.organization_id from public.org_memberships m2 where m2.user_id = m.user_id and m2.status = 'active' order by m2.decided_at desc nulls last limit 1) as org_id
                 from public.org_memberships m where m.status = 'active' and m.user_id is not null)
    select p.user_id, p.org_id, 'birthday' as kind, public.k1_user_birthday(p.user_id) as d, coalesce(cp.show_birthday, true) as shown from ppl p left join public.cm_user_profiles cp on cp.user_id = p.user_id
    union all
    select p.user_id, p.org_id, 'anniversary', cp.anniversary, coalesce(cp.show_anniversary, true) from ppl p join public.cm_user_profiles cp on cp.user_id = p.user_id where cp.anniversary is not null
  loop
    if r.d is null or r.org_id is null then continue; end if;
    if extract(month from r.d) <> extract(month from today) or extract(day from r.d) <> extract(day from today) then
      -- 29 Feb in a non-leap year → 28 Feb
      if not (extract(month from r.d) = 2 and extract(day from r.d) = 29 and extract(month from today) = 2 and extract(day from today) = 28 and not (yr % 4 = 0 and (yr % 100 <> 0 or yr % 400 = 0))) then continue; end if;
    end if;
    if exists (select 1 from public.cm_occasion_log l where l.user_id = r.user_id and l.kind = r.kind and l.year = yr) then continue; end if;
    select * into org from core.organizations where id = r.org_id;
    select coalesce(s.occasion_posts, true), coalesce(s.occasion_greetings, true) into post_on, greet_on from public.cm_settings s where s.organization_id = r.org_id;
    post_on := coalesce(post_on, true); greet_on := coalesce(greet_on, true);
    nm := public.k1_user_name(r.user_id);
    if r.kind = 'birthday' then
      subj := '🎂 जन्मदिन की हार्दिक शुभकामनाएँ, ' || nm || ' जी!';
      greet := coalesce(org.name_hi, org.name) || ' परिवार की ओर से आपको जन्मदिन की ढेर सारी शुभकामनाएँ। आप स्वस्थ रहें, सुखी रहें और समाज की सेवा में यूँ ही आगे बढ़ते रहें। 🙏';
    else
      subj := '💐 विवाह वर्षगाँठ की हार्दिक शुभकामनाएँ, ' || nm || ' जी!';
      greet := coalesce(org.name_hi, org.name) || ' परिवार की ओर से आप दोनों को वैवाहिक जीवन की वर्षगाँठ पर बहुत-बहुत बधाई। 🙏';
    end if;
    pid := null;
    if post_on and r.shown then
      begin
        insert into public.cm_posts (organization_id, author_id, body, visibility, as_org, mentions)
        values (coalesce(public.k1_root_org(r.org_id), r.org_id), r.user_id,
                case when r.kind = 'birthday' then '🎂 आज हमारे सदस्य ' || nm || ' जी का जन्मदिन है। ' else '💐 आज हमारे सदस्य ' || nm || ' जी की विवाह वर्षगाँठ है। ' end
                || coalesce(org.name_hi, org.name) || ' परिवार की ओर से हार्दिक शुभकामनाएँ — आप भी नीचे शुभकामना दीजिए! 🙏',
                'members', r.org_id, array[r.user_id])
        returning id into pid;
      exception when others then pid := null; end;
    end if;
    begin
      insert into public.cm_notifications (organization_id, user_id, kind, text, post_id) values (r.org_id, r.user_id, r.kind, subj, pid);
    exception when others then null; end;
    if greet_on then
      begin perform public.k1_notify_user(r.org_id, r.user_id, subj, greet, '/community', 'cm_occasion_log', null); exception when others then null; end;
    end if;
    insert into public.cm_occasion_log (user_id, kind, year, organization_id, post_id) values (r.user_id, r.kind, yr, r.org_id, pid) on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.k1_occasions_daily() from public, anon, authenticated;

do $$ begin perform cron.unschedule('k1-occasions'); exception when others then null; end $$;
select cron.schedule('k1-occasions', '30 3 * * *', $$select public.k1_occasions_daily()$$);   -- 09:00 IST
