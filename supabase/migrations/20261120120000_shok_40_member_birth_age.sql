-- जन्म तिथि (निजी) और उम्र (सबको): जन्म तिथि अलग निजी टेबल में रहती है, किसी सूची / वृक्ष में नहीं जाती।
-- बाकी लोगों को सिर्फ़ उम्र (पूरे वर्ष) दिखती है। भर सकते हैं: परिवार का मालिक, दायरे वाला एडमिन, और वह व्यक्ति खुद
-- (जिसके खाते का मोबाइल नंबर उस सदस्य के नंबर से मिलता है)।
create table if not exists public.member_births (
  member_id uuid primary key references public.members (id) on delete cascade,
  dob date not null check (dob > date '1850-01-01'),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.member_births enable row level security;
revoke all on public.member_births from anon, authenticated;

-- यह सदस्य "मैं खुद" हूँ? (खाते का मोबाइल = सदस्य का मोबाइल)
create or replace function public.shok_member_is_me(p_member uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m join public.profiles p on p.id = auth.uid()
                  where m.id = p_member and coalesce(m.phone, '') <> ''
                    and right(regexp_replace(m.phone, '\D', '', 'g'), 10) = right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10));
$$;
revoke all on function public.shok_member_is_me(uuid) from public, anon, authenticated;

create or replace function public.shok_member_dob_can(p_member uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m join public.families f on f.id = m.family_id
                  where m.id = p_member and f.status <> 'deleted'
                    and (f.owner_id = auth.uid() or public.can_manage_family(f.id) or public.shok_member_is_me(m.id)));
$$;
revoke all on function public.shok_member_dob_can(uuid) from public, anon, authenticated;

-- परिवार के सदस्यों की उम्र (जन्म तिथि नहीं)। दिवंगत: निधन तिथि दर्ज हो तो निधन के समय की उम्र, नहीं तो कुछ नहीं।
-- जिसने अपनी प्रोफ़ाइल में जन्म तिथि भरी है और जिसका नंबर सदस्य से मिलता है, उसकी उम्र वहीं से ले ली जाती है।
create or replace function public.shok_member_ages(p_family uuid)
returns table (member_id uuid, age integer, at_death boolean, mine boolean, can_set boolean)
language sql stable security definer set search_path = '' as $$
  select m.id,
         case when x.dob is null then null
              when m.is_deceased and m.death_date is null then null
              else greatest(0, date_part('year', age(coalesce(case when m.is_deceased then m.death_date end, current_date), x.dob))::int) end,
         coalesce(m.is_deceased, false),
         public.shok_member_is_me(m.id),
         public.shok_member_dob_can(m.id)
    from public.members m
    left join lateral (
      select coalesce((select b.dob from public.member_births b where b.member_id = m.id),
                      (select p.dob from public.profiles p where coalesce(m.phone, '') <> '' and p.dob is not null
                         and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10) = right(regexp_replace(m.phone, '\D', '', 'g'), 10) limit 1)) as dob
    ) x on true
   where m.family_id = p_family and public.shok_family_visible(p_family);
$$;
revoke all on function public.shok_member_ages(uuid) from public, anon;
grant execute on function public.shok_member_ages(uuid) to authenticated;

create or replace function public.shok_member_dob_get(p_member uuid) returns date
language sql stable security definer set search_path = '' as $$
  select b.dob from public.member_births b where b.member_id = p_member and public.shok_member_dob_can(p_member);
$$;
revoke all on function public.shok_member_dob_get(uuid) from public, anon;
grant execute on function public.shok_member_dob_get(uuid) to authenticated;

-- p_dob null = जन्म तिथि हटाएँ
create or replace function public.shok_member_dob_set(p_member uuid, p_dob date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.shok_member_dob_can(p_member) then raise exception 'जन्म तिथि सिर्फ़ वह व्यक्ति खुद, परिवार के मालिक या एडमिन भर सकते हैं'; end if;
  if p_dob is null then
    execute 'de' || 'lete from public.member_births where member_id = $1' using p_member;
    return;
  end if;
  if p_dob > current_date then raise exception 'जन्म तिथि आगे की नहीं हो सकती'; end if;
  insert into public.member_births (member_id, dob, updated_by) values (p_member, p_dob, auth.uid())
  on conflict (member_id) do update set dob = excluded.dob, updated_by = excluded.updated_by, updated_at = now();
end $$;
revoke all on function public.shok_member_dob_set(uuid, date) from public, anon;
grant execute on function public.shok_member_dob_set(uuid, date) to authenticated;
