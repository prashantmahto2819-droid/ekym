-- पुण्यतिथि: दिवंगत सदस्य की निधन-तिथि (वैकल्पिक) और "आने वाली पुण्यतिथियाँ" (सिर्फ़ ऐप के अंदर, कोई संदेश नहीं जाता)
alter table public.members add column if not exists death_date date;

create or replace function public.shok_upcoming_punyatithi(p_days integer default 30)
returns table (member_id uuid, name text, family_id uuid, family_name text, village_name text, death_date date, next_date date, years integer)
language sql stable security definer set search_path = '' as $$
  select x.id, x.name, x.family_id, x.family_name, x.village_name, x.death_date, x.next_date,
         (extract(year from x.next_date) - extract(year from x.death_date))::int
    from (
      select m.id, m.name, f.id as family_id, f.family_name, coalesce(mv.name, fv.name) as village_name, m.death_date,
             (m.death_date + ((date_part('year', age(current_date - 1, m.death_date))::int + 1) * interval '1 year'))::date as next_date
        from public.members m
        join public.families f on f.id = m.family_id
        left join public.villages mv on mv.id = m.village_id
        left join public.villages fv on fv.id = f.village_id
       where public.is_approved() and m.is_deceased and m.death_date is not null and m.death_date < current_date
         and not m.name_unknown and f.status = 'approved' and f.kind = 'tree'
         and public.shok_sees_org(f.organization_id)
    ) x
   where x.next_date <= current_date + greatest(1, least(coalesce(p_days, 30), 366))
   order by x.next_date, x.name;
$$;
revoke all on function public.shok_upcoming_punyatithi(integer) from public, anon;
grant execute on function public.shok_upcoming_punyatithi(integer) to authenticated;
