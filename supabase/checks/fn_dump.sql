do $$ declare r record; begin
  for r in select o.name, (select count(*) from public.members m where m.origin_village_id = o.id) n from public.origin_villages o
            where o.name in ('दिपका','दीपका','नवगांव','नवागाँव','नवागांव','पन्तोरा','पंतोरा','सलिहाभांठा','सलिहाभाँठा','संडैल','सन्डैल','गाडापाली','गांडापाली','गाड़ापाली','चाम्पा','चांपा','सिवनी','शिवनी','मनगांव दीपका','मनगांव, दीपका') order by 1 loop
    raise notice 'O % %', r.name, r.n; end loop;
end $$;
