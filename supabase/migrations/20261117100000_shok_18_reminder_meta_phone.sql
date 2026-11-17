-- याद संदेश: खाता बनाते समय दिया गया व्हाट्सएप नंबर (auth metadata) भी गिनें, ताकि अधूरी जानकारी वालों तक याद पहुँचे
do $$
declare d text;
begin
  d := pg_get_functiondef('public.shok_send_reminders()'::regprocedure);
  d := replace(d, $r$regexp_replace(coalesce(nullif(p.phone, ''), u.phone, ''), '\D', '', 'g') as ph$r$,
                  $r$regexp_replace(coalesce(nullif(p.phone, ''), nullif(u.phone, ''), u.raw_user_meta_data->>'phone', ''), '\D', '', 'g') as ph$r$);
  if position('raw_user_meta_data' in d) = 0 then raise exception 'patch failed'; end if;
  execute d;
end $$;
