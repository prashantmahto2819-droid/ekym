do $$ declare r record; begin
  for r in select v.id, v.name, (select count(*) from public.families f where f.village_id = v.id and f.status <> 'deleted') fams,
                  (select count(*) from public.members m where m.village_id = v.id) mems,
                  (select count(*) from public.profiles p where lower(btrim(p.village)) = lower(btrim(v.name))) users
             from public.villages v order by v.name loop
    raise notice 'V|%|%|%|%|%', r.id, r.name, r.fams, r.mems, r.users;
  end loop;
  for r in select o.id, o.name, s.name reg, (select count(*) from public.members m where m.origin_village_id = o.id) mems from public.origin_villages o left join public.social_regions s on s.id = o.region_id order by o.name loop
    raise notice 'O|%|%|%|%', r.id, r.name, coalesce(r.reg,'-'), r.mems;
  end loop;
end $$;
