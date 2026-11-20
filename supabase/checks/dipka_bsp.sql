do $$
declare r record;
begin
  for r in select 'परिवार' t, f.family_name n, '-' father, f.status s, '-' fam from public.families f join public.villages v on v.id = f.village_id where v.name = 'दीपका/बिलासपुर' and f.status <> 'deleted'
           union all
           select 'सदस्य', m.name, coalesce(p.name, '-'), case when m.is_deceased then 'स्व.' else coalesce(m.member_kind, 'son') end, f.family_name
             from public.members m join public.villages v on v.id = m.village_id join public.families f on f.id = m.family_id left join public.members p on p.id = m.parent_id
            where v.name = 'दीपका/बिलासपुर' and f.status <> 'deleted' loop
    raise notice 'ROW|%|%|%|%|%', r.t, r.n, r.father, r.s, r.fam;
  end loop;
  for r in select name from public.origin_villages where name ~ '(मनग|दीपका)' order by 1 loop raise notice 'ROW|origin now|%|||', r.name; end loop;
end $$;
