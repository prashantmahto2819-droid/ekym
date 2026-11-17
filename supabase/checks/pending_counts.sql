do $$ declare r record; begin
  for r in select l.id, l.status, l.kind, o.slug, l.created_at::date d from public.letters l left join core.organizations o on o.id = l.organization_id loop
    raise notice 'LETTER % % % org=% %', r.id, r.status, r.kind, r.slug, r.d; end loop;
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
