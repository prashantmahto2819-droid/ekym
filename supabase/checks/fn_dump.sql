do $$ declare f record; begin
  select fa.id, m.phone into f from public.families fa join public.members m on m.family_id = fa.id and m.is_head
   where fa.status <> 'deleted' and coalesce(m.phone,'') <> '' and m.phone is distinct from fa.main_whatsapp limit 1;
  begin
    update public.families set main_whatsapp = f.phone where id = f.id;
    raise notice 'CHECK family main := head phone OK';
  exception when others then raise notice 'CHECK family main := head phone FAILED % %', sqlstate, sqlerrm; end;
end $$;
