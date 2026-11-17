do $$ declare w record; pname text; fam record; adder text; i int := 0; begin
  for w in select * from public.shok_phone_welcomes where created_at > now() - interval '3 hours' or status = 'queued' order by status, created_at limit 40 loop
    select f.family_name, f.contact_name into fam from public.families f where f.id = w.family_id;
    select full_name into adder from public.profiles where id = w.added_by;
    pname := nullif(btrim(w.person_name), '');
    if w.kind = 'family_main' or pname = fam.family_name then
      select m.name into pname from public.members m
       where m.family_id = w.family_id and not coalesce(m.is_deceased, false) and not coalesce(m.name_unknown, false)
         and (regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') in (w.phone, right(w.phone, 10)) or m.is_head)
       order by (regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') in (w.phone, right(w.phone, 10))) desc, m.is_head desc, m.created_at limit 1;
      if pname is null then select nullif(btrim(f.contact_name), '') into pname from public.families f where f.id = w.family_id; end if;
      if pname = fam.family_name then pname := null; end if;
    end if;
    raise notice 'W % % | greet=% | family=% | contact=% | adder=%', w.status, w.kind, coalesce(pname,'(none)'), fam.family_name, coalesce(fam.contact_name,'-'), coalesce(adder,'-');
  end loop;
end $$;
