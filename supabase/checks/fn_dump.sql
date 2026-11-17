do $$ begin
  raise notice 'CHECK auth phone for 9770974077: %', (select phone from auth.users where id = 'debf929b-6baa-4939-9290-19a842240403');
  raise notice 'CHECK profiles with phone but auth phone empty: %', (select count(*) from public.profiles p join auth.users u on u.id = p.id where coalesce(p.phone,'') <> '' and coalesce(u.phone,'') = '');
end $$;
