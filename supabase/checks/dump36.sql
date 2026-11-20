do $$
declare r record;
begin
  for r in select p.proname, pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.proname in ('guard_member_kind','trg_letter_recipient_no_mother_as_father','suggest_member','decide_suggestion') loop
    raise notice 'FN<<%>>%<<END>>', r.proname, r.d;
  end loop;
  for r in select p.proname, position('woman' in pg_get_functiondef(p.oid)) > 0 w, length(pg_get_functiondef(p.oid)) n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.proname in ('directory_members','create_letter_recipients','family_tree','lineage_tree','shok_deliver_phone','shok_notice_recipients','pending_suggestions') loop
    raise notice 'HAS % woman=% len=%', r.proname, r.w, r.n;
  end loop;
  for r in select o.name, sr.name region, (select count(*) from public.members m where m.origin_village_id = o.id) n from public.origin_villages o left join public.social_regions sr on sr.id = o.region_id
            where o.name ~ '(ढोड|ढोढ|मनग|मनगा|कुकद|कुरद|दीपका|दिपका|तराई)' order by 1 loop
    raise notice 'ORIGIN % | % | %', r.name, r.region, r.n;
  end loop;
  for r in select v.name, (select count(*) from public.families f where f.village_id = v.id) f, (select count(*) from public.members m where m.village_id = v.id) n from public.villages v
            where v.name ~ '(ढोड|ढोढ|मनग|कुकद|कुरद|दीपका|दिपका|तराई)' order by 1 loop
    raise notice 'VILLAGE % | fam % | mem %', r.name, r.f, r.n;
  end loop;
  for r in select string_agg(name, ' ~ ' order by name) g, 'origin' t from public.origin_villages group by translate(replace(replace(replace(replace(name,' ',''),'़',''),'ँ','ं'),'ी','ि'),'ूढ़','ुढ') having count(*) > 1
           union all select string_agg(name, ' ~ ' order by name), 'village' from public.villages group by translate(replace(replace(replace(replace(name,' ',''),'़',''),'ँ','ं'),'ी','ि'),'ूढ़','ुढ') having count(*) > 1 loop
    raise notice 'SAME-LOOKING (%) %', r.t, r.g;
  end loop;
  for r in select column_name from information_schema.columns where table_schema='public' and table_name='members' and column_name in ('photo_path','bio') loop raise notice 'COL %', r.column_name; end loop;
  for r in select count(*) c from public.members where photo_path is not null loop raise notice 'members with photo_path: %', r.c; end loop;
end $$;
