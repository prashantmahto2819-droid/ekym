-- डेटाबेस का आकार, सबसे बड़ी तालिकाएँ, storage और गिनती (सिर्फ़ पढ़ना)
do $$
declare r record;
begin
  raise notice 'DB total: %', pg_size_pretty(pg_database_size(current_database()));
  for r in select n.nspname||'.'||c.relname t, pg_total_relation_size(c.oid) s
           from pg_class c join pg_namespace n on n.oid=c.relnamespace
           where c.relkind in ('r','m') and n.nspname not in ('pg_catalog','information_schema')
           order by 2 desc limit 25 loop
    raise notice 'TABLE % = %', r.t, pg_size_pretty(r.s);
  end loop;
  for r in select bucket_id b, count(*) n, coalesce(sum((metadata->>'size')::bigint),0) s from storage.objects group by 1 order by 3 desc loop
    raise notice 'BUCKET % : % files, %', r.b, r.n, pg_size_pretty(r.s);
  end loop;
  raise notice 'auth users: %', (select count(*) from auth.users);
  raise notice 'active last 30d: %', (select count(*) from auth.users where last_sign_in_at > now()-interval '30 days');
  raise notice 'orgs: %', (select count(*) from core.organizations);
  raise notice 'memberships: %', (select count(*) from public.org_memberships);
  raise notice 'families: %, members: %', (select count(*) from public.families), (select count(*) from public.members);
  raise notice 'letters: %, recipients: %', (select count(*) from public.letters), (select count(*) from public.letter_recipients);
  raise notice 'connections now: %, max: %', (select count(*) from pg_stat_activity), current_setting('max_connections');
exception when others then raise notice 'ERR %', sqlerrm;
end $$;
