do $$ declare r record; begin
  raise notice 'CHECK total=% cg=% cg_hi=%', (select count(*) from public.assembly_constituencies), (select count(*) from public.assembly_constituencies where state='Chhattisgarh'), (select count(*) from public.assembly_constituencies where name_hi is not null);
  for r in select state, count(*) n from public.assembly_constituencies group by 1 order by 1 loop raise notice 'S % %', r.state, r.n; end loop;
  raise notice 'CHECK korba: %', (select string_agg(name_hi, ', ' order by ac_no) from public.assembly_constituencies where district = 'Korba');
end $$;
