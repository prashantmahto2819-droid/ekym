do $$ declare r record; begin
  for r in select v.name, (select count(*) from public.families f where f.village_id = v.id and f.status <> 'deleted') fa, (select count(*) from public.members m where m.village_id = v.id) me
             from public.villages v where v.name in ('पन्तोरा','पंतोरा','मनगांव दीपका','मनगांव, दीपका','DIPKA','दीपका','ऐंटिपिसि','एन टी पी सी') loop
    raise notice 'V % families=% members=%', r.name, r.fa, r.me; end loop;
end $$;
