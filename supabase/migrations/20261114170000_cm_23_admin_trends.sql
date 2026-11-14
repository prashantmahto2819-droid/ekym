-- Admin dashboard charts: per-day activity for the last N days, members by district, membership status split.
-- Org team / platform admins only. Additive.
create or replace function public.k1_admin_trends(p_org uuid, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare n int := least(greatest(coalesce(p_days, 30), 7), 365); since date; res jsonb;
begin
  if not (core.is_platform_admin() or core.is_org_team(p_org)) then raise exception 'not allowed'; end if;
  since := (now() at time zone 'Asia/Kolkata')::date - (n - 1);
  with days as (select generate_series(since, since + (n - 1), interval '1 day')::date d),
  ap as (select (m.applied_at at time zone 'Asia/Kolkata')::date d, count(*) c from public.org_memberships m where m.organization_id = p_org and m.applied_at >= since group by 1),
  ok as (select (m.decided_at at time zone 'Asia/Kolkata')::date d, count(*) c from public.org_memberships m where m.organization_id = p_org and m.status = 'active' and m.decided_at >= since group by 1),
  po as (select (p.created_at at time zone 'Asia/Kolkata')::date d, count(*) c from public.cm_posts p where p.organization_id = p_org and p.created_at >= since group by 1),
  dn as (select (x.paid_at at time zone 'Asia/Kolkata')::date d, sum(x.amount) s, count(*) c from public.donations x where x.organization_id = p_org and x.status::text = 'PAID' and x.paid_at >= since group by 1),
  ch as (select (m.created_at at time zone 'Asia/Kolkata')::date d, count(*) c from public.cm_chat_messages m join public.cm_chat_rooms r on r.id = m.room_id where r.organization_id = p_org and m.created_at >= since group by 1),
  bl as (select (b.created_at at time zone 'Asia/Kolkata')::date d, count(*) c from public.blood_requirements b where b.organization_id = p_org and b.created_at >= since group by 1)
  select jsonb_build_object(
    'days', (select jsonb_agg(jsonb_build_object('d', days.d, 'applied', coalesce(ap.c, 0), 'approved', coalesce(ok.c, 0), 'posts', coalesce(po.c, 0),
                       'donations', coalesce(dn.s, 0), 'donation_count', coalesce(dn.c, 0), 'chat', coalesce(ch.c, 0), 'blood', coalesce(bl.c, 0)) order by days.d)
               from days left join ap using (d) left join ok using (d) left join po using (d) left join dn using (d) left join ch using (d) left join bl using (d)),
    'districts', (select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'n', x.n) order by x.n desc), '[]'::jsonb)
                    from (select coalesce(nullif(btrim(m.district), ''), '—') name, count(*) n from public.org_memberships m
                           where m.organization_id = p_org and m.status = 'active' group by 1 order by 2 desc limit 10) x),
    'status', (select coalesce(jsonb_object_agg(x.status, x.n), '{}'::jsonb) from (select m.status, count(*) n from public.org_memberships m where m.organization_id = p_org group by 1) x)
  ) into res;
  return res;
end $$;
revoke all on function public.k1_admin_trends(uuid, int) from public, anon;
grant execute on function public.k1_admin_trends(uuid, int) to authenticated;
