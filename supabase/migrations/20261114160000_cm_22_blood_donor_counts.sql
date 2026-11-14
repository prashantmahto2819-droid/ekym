-- Blood page: how many registered donors per blood group (and how many can give today). Totals only, no names. Additive.
create or replace function public.k1_blood_donor_counts(p_org uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('g', g, 'n', n, 'ready', ready) order by g), '[]'::jsonb)
    from (select b.blood_group g, count(*)::int n,
                 count(*) filter (where coalesce(b.emergency_available, true) and (b.eligible_from is null or b.eligible_from <= current_date))::int ready
            from public.blood_donors b
           where b.organization_id = p_org and coalesce(b.consent, true) and b.blood_group is not null
           group by b.blood_group) x
$$;
revoke all on function public.k1_blood_donor_counts(uuid) from public;
grant execute on function public.k1_blood_donor_counts(uuid) to anon, authenticated;
