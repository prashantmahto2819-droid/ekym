do $$ begin
  raise notice 'CHECK cols ov=% v=% p=%', (select count(*) from information_schema.columns where table_name='origin_villages' and column_name='vidhansabha'),
    (select count(*) from information_schema.columns where table_name='villages' and column_name='vidhansabha'),
    (select count(*) from information_schema.columns where table_name='profiles' and column_name='vidhansabha');
  raise notice 'CHECK my_profile has vidhansabha: %', (select to_jsonb(p) ? 'vidhansabha' from public.profiles p limit 1);
end $$;
