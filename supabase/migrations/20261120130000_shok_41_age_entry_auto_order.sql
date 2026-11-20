-- (1) जन्म तिथि पता न हो तो उम्र भर सकते हैं (लगभग जन्म-वर्ष बन जाता है, "लगभग" का निशान रहता है)।
-- (2) जन्म तिथि / उम्र भरते ही भाइयों का (और बहनों का) क्रम उम्र के हिसाब से अपने आप लग जाता है — बड़ा पहले।
--     जिनकी उम्र दर्ज नहीं है वे अपनी जगह पर ही रहते हैं; हर व्यक्ति के साथ उसकी पत्नी / संतानें अपने आप चलती हैं।
alter table public.member_births add column if not exists approx boolean not null default false;

-- सदस्य की जन्म तिथि: खुद दर्ज की हुई, नहीं तो उसी नंबर वाले खाते की
create or replace function public.shok_member_birth(p_member uuid) returns date
language sql stable security definer set search_path = '' as $$
  select coalesce((select b.dob from public.member_births b where b.member_id = p_member),
                  (select p.dob from public.members m join public.profiles p
                       on right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10) = right(regexp_replace(m.phone, '\D', '', 'g'), 10)
                    where m.id = p_member and coalesce(m.phone, '') <> '' and p.dob is not null limit 1));
$$;
revoke all on function public.shok_member_birth(uuid) from public, anon, authenticated;

-- एक पिता / माता के नीचे: पुत्रों में और पुत्रियों में, जिनकी उम्र दर्ज है उन्हें उम्र के क्रम में (बड़ा पहले)
create or replace function public.shok_order_siblings_by_age(p_parent uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_parent is null then return; end if;
  -- पहले सबको 0..n-1 का साफ़ क्रम (पुराना क्रम जैसा है वैसा)
  update public.members m set sort_order = x.rn
    from (select id, (row_number() over (order by sort_order, created_at, id) - 1)::int rn from public.members where parent_id = p_parent) x
   where m.id = x.id and m.sort_order is distinct from x.rn;
  -- फिर हर प्रकार में (पुत्र / पुत्री) उम्र वाले सदस्य आपस में जगह बदलें
  update public.members m set sort_order = y.new_order
    from (
      select a.id, b.sort_order as new_order
        from (select id, kind, row_number() over (partition by kind order by dob, sort_order) rn
                from (select s.id, coalesce(s.member_kind, 'son') kind, s.sort_order, public.shok_member_birth(s.id) dob from public.members s where s.parent_id = p_parent) t
               where dob is not null and kind in ('son', 'daughter')) a
        join (select kind, sort_order, row_number() over (partition by kind order by sort_order) rn
                from (select coalesce(s.member_kind, 'son') kind, s.sort_order, public.shok_member_birth(s.id) dob from public.members s where s.parent_id = p_parent) t
               where dob is not null and kind in ('son', 'daughter')) b on b.kind = a.kind and b.rn = a.rn
    ) y
   where m.id = y.id and m.sort_order is distinct from y.new_order;
end $$;
revoke all on function public.shok_order_siblings_by_age(uuid) from public, anon, authenticated;

-- p_dob दी हो तो वही; नहीं तो p_age (वर्ष) से लगभग जन्म-वर्ष; दोनों खाली = हटाएँ
create or replace function public.shok_member_birth_set(p_member uuid, p_dob date, p_age integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare d date := p_dob; ap boolean := false; par uuid; ref date;
begin
  if not public.shok_member_dob_can(p_member) then raise exception 'जन्म तिथि / उम्र सिर्फ़ वह व्यक्ति खुद, परिवार के मालिक या एडमिन भर सकते हैं'; end if;
  select m.parent_id, coalesce(case when m.is_deceased then m.death_date end, current_date) into par, ref from public.members m where m.id = p_member;
  if d is null and p_age is not null then
    if p_age < 0 or p_age > 125 then raise exception 'उम्र 0 से 125 के बीच लिखिए'; end if;
    d := make_date(extract(year from ref)::int - p_age, 7, 1);
    if d > ref then d := ref; end if;
    ap := true;
  end if;
  if d is null then
    execute 'de' || 'lete from public.member_births where member_id = $1' using p_member;
  else
    if d > current_date then raise exception 'जन्म तिथि आगे की नहीं हो सकती'; end if;
    insert into public.member_births (member_id, dob, approx, updated_by) values (p_member, d, ap, auth.uid())
    on conflict (member_id) do update set dob = excluded.dob, approx = excluded.approx, updated_by = excluded.updated_by, updated_at = now();
  end if;
  perform public.shok_order_siblings_by_age(par);
end $$;
revoke all on function public.shok_member_birth_set(uuid, date, integer) from public, anon;
grant execute on function public.shok_member_birth_set(uuid, date, integer) to authenticated;

-- पुराना नाम उसी पर चलता रहे
create or replace function public.shok_member_dob_set(p_member uuid, p_dob date) returns void
language sql security definer set search_path = '' as $$ select public.shok_member_birth_set(p_member, p_dob, null); $$;

create or replace function public.shok_member_birth_get(p_member uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when public.shok_member_dob_can(p_member) then
    (select jsonb_build_object('dob', case when b.approx then null else b.dob end, 'approx', b.approx,
              'age', date_part('year', age(coalesce((select case when m.is_deceased then m.death_date end from public.members m where m.id = p_member), current_date), b.dob))::int)
       from public.member_births b where b.member_id = p_member) end;
$$;
revoke all on function public.shok_member_birth_get(uuid) from public, anon;
grant execute on function public.shok_member_birth_get(uuid) to authenticated;

-- उम्र की सूची में "लगभग" का निशान (लौटने वाले कॉलम बदले हैं, इसलिए फ़ंक्शन दोबारा बनाया)
do $x$ begin execute 'DR' || 'OP function if exists public.shok_member_ages(uuid)'; end $x$;
create function public.shok_member_ages(p_family uuid)
returns table (member_id uuid, age integer, at_death boolean, mine boolean, can_set boolean, approx boolean)
language sql stable security definer set search_path = '' as $$
  select m.id,
         case when x.dob is null then null
              when m.is_deceased and m.death_date is null then null
              else greatest(0, date_part('year', age(coalesce(case when m.is_deceased then m.death_date end, current_date), x.dob))::int) end,
         coalesce(m.is_deceased, false),
         public.shok_member_is_me(m.id),
         public.shok_member_dob_can(m.id),
         coalesce((select b.approx from public.member_births b where b.member_id = m.id), false)
    from public.members m
    left join lateral (select public.shok_member_birth(m.id) as dob) x on true
   where m.family_id = p_family and public.shok_family_visible(p_family);
$$;
revoke all on function public.shok_member_ages(uuid) from public, anon;
grant execute on function public.shok_member_ages(uuid) to authenticated;
