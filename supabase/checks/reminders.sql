do $$ declare r record; begin
  for r in
    with base as (select p.id, p.full_name, p.status, p.details_done_at, p.created_at, regexp_replace(coalesce(nullif(p.phone, ''), u.phone, ''), '\D', '', 'g') ph from public.profiles p join auth.users u on u.id = p.id where p.status <> 'rejected')
    select 'details' k, count(*) c, count(*) filter (where length(ph) >= 10) withphone from base where details_done_at is null and created_at < now() - interval '1 day'
    union all select 'tree', count(*), count(*) filter (where length(ph) >= 10) from base b where details_done_at is not null and not exists (select 1 from public.families f where f.owner_id = b.id and f.status <> 'deleted' and f.kind='tree')
         and not exists (select 1 from public.members m join public.families f on f.id = m.family_id where f.status <> 'deleted' and length(b.ph) >= 10 and right(regexp_replace(coalesce(m.phone,''),'\D','','g'),10) = right(b.ph,10))
  loop raise notice 'CAND % total=% with_phone=%', r.k, r.c, r.withphone; end loop;
  raise notice 'cron: %', (select schedule from cron.job where jobname = 'shok-reminders');
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
