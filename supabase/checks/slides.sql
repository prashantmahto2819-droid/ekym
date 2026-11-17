do $$ declare r record; begin
  for r in select s.* from public.homepage_slides s join core.organizations o on o.id = s.organization_id where o.slug = 'kalchuri-one' order by s.display_order loop
    raise notice 'SLIDE %', row_to_json(r)::text; end loop;
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
