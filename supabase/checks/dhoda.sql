do $$
declare r record;
begin
  for r in select o.name o, sr.name region, m.name, m.is_deceased d, m.member_kind k, p.name father, f.family_name, coalesce(mv.name, fv.name) v, f.status
             from public.origin_villages o left join public.social_regions sr on sr.id = o.region_id
             join public.members m on m.origin_village_id = o.id join public.families f on f.id = m.family_id
             left join public.members p on p.id = m.parent_id left join public.villages mv on mv.id = m.village_id left join public.villages fv on fv.id = f.village_id
            where o.name in ('ढोडा तराई', 'ढोढा तराई') and f.status <> 'deleted'
            order by o.name, f.family_name, m.created_at loop
    raise notice 'ROW|%|%|%|%|%|%|%|%|%', r.o, r.region, r.name, r.d, coalesce(r.k,'son'), coalesce(r.father,'-'), r.family_name, coalesce(r.v,'-'), r.status;
  end loop;
end $$;
