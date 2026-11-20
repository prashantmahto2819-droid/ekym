-- हर संस्था के लिए (Kalchuri One): रिपोर्ट और आने वाली पुण्यतिथियाँ। कोई संदेश नहीं जाता।

-- संस्था की रिपोर्ट: सिर्फ़ उस संस्था के वंश-वृक्ष सँभालने वाले एडमिन को
create or replace function public.shok_report(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare j jsonb;
begin
  if not (core.can(p_org, 'family.manage') or core.is_platform_admin()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.super_admin or (p.role = 'admin' and p.status = 'approved' and p_org = public.shok_home_org())))) then
    raise exception 'यह रिपोर्ट सिर्फ़ संस्था के एडमिन देख सकते हैं';
  end if;
  with fams as (
    select f.* from public.families f where f.status <> 'deleted' and f.kind = 'tree' and public.shok_org_in(f.organization_id, p_org)
  ), mem as (
    select m.*, f.village_id as fam_village from public.members m join fams f on f.id = m.family_id
  ), live as (
    select * from mem where not is_deceased and not name_unknown
  ), vill as (
    select coalesce(v.name, 'गाँव दर्ज नहीं') as name, count(distinct l.family_id) fams, count(*) living,
           count(*) filter (where coalesce(l.phone, '') <> '') phone,
           count(*) filter (where l.is_head and coalesce(l.phone, '') = '') head_no
      from live l left join public.villages v on v.id = coalesce(l.village_id, l.fam_village)
     group by 1
  ), lets as (
    select l.id, l.created_at, coalesce(l.kind, 'shok') kind, coalesce(nullif(l.title, ''), l.deceased_name) title,
           (select count(*) from public.letter_recipients r where r.letter_id = l.id) total,
           (select count(*) from public.letter_recipients r where r.letter_id = l.id and r.status = 'sent') sent,
           (select count(*) from public.letter_recipients r where r.letter_id = l.id and r.status = 'sent' and (r.delivered_at is not null or r.read_at is not null)) delivered,
           (select count(*) from public.letter_recipients r where r.letter_id = l.id and r.status = 'sent' and r.read_at is not null) read,
           (select count(*) from public.letter_recipients r where r.letter_id = l.id and r.status = 'failed') failed
      from public.letters l
     where public.shok_org_in(l.organization_id, p_org) and l.created_at > now() - interval '90 days' and l.status not in ('draft', 'rejected')
  )
  select jsonb_build_object(
    'families', jsonb_build_object('approved', (select count(*) from fams where status = 'approved'), 'pending', (select count(*) from fams where status = 'pending'), 'draft', (select count(*) from fams where status = 'draft')),
    'living', (select count(*) from live),
    'deceased', (select count(*) from mem where is_deceased),
    'with_phone', (select count(*) from live where coalesce(phone, '') <> ''),
    'heads_no_phone', (select count(*) from live where is_head and coalesce(phone, '') = ''),
    'no_whatsapp', (select count(*) from live where whatsapp_ok is false),
    'suspended', (select count(*) from live where suspended_at is not null),
    'no_head_families', (select count(*) from fams f where f.status in ('approved', 'pending') and not exists (select 1 from live l where l.family_id = f.id and l.is_head)),
    'villages', coalesce((select jsonb_agg(to_jsonb(v) order by (v.living - v.phone) desc, v.name) from vill v), '[]'::jsonb),
    'letters', coalesce((select jsonb_agg(to_jsonb(x) - 'id' order by x.created_at desc) from lets x), '[]'::jsonb),
    'months', coalesce((select jsonb_agg(jsonb_build_object('month', to_char(g.m, 'YYYY-MM'),
                   'families', (select count(*) from fams f where date_trunc('month', f.created_at) = g.m),
                   'members', (select count(*) from mem m where date_trunc('month', m.created_at) = g.m)) order by g.m)
                 from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') g(m)), '[]'::jsonb)
  ) into j;
  return j;
end $$;
revoke all on function public.shok_report(uuid) from public, anon;
grant execute on function public.shok_report(uuid) to authenticated;

-- आने वाली पुण्यतिथियाँ, एक संस्था की (मंज़ूर सदस्य; मोबाइल नंबर नहीं)
create or replace function public.shok_upcoming_punyatithi_org(p_org uuid, p_days integer default 30)
returns table (member_id uuid, name text, family_id uuid, family_name text, village_name text, next_date date, years integer)
language sql stable security definer set search_path = '' as $$
  select x.id, x.name, x.family_id, x.family_name, x.village_name, x.next_date, (extract(year from x.next_date) - extract(year from x.death_date))::int
    from (
      select m.id, m.name, f.id as family_id, f.family_name, coalesce(mv.name, fv.name) as village_name, m.death_date,
             (m.death_date + ((date_part('year', age(current_date - 1, m.death_date))::int + 1) * interval '1 year'))::date as next_date
        from public.members m join public.families f on f.id = m.family_id
        left join public.villages mv on mv.id = m.village_id left join public.villages fv on fv.id = f.village_id
       where public.is_approved() and m.is_deceased and m.death_date is not null and m.death_date < current_date and not m.name_unknown
         and f.status = 'approved' and f.kind = 'tree' and public.shok_org_in(f.organization_id, p_org) and public.shok_sees_org(f.organization_id)
    ) x
   where x.next_date <= current_date + greatest(1, least(coalesce(p_days, 30), 366))
   order by x.next_date, x.name;
$$;
revoke all on function public.shok_upcoming_punyatithi_org(uuid, integer) from public, anon;
grant execute on function public.shok_upcoming_punyatithi_org(uuid, integer) to authenticated;
