-- Phase 42 · ex_04: hand-written question loader + Hindi explanation in the level review.
-- ex_add_facts was used (via the database console) to load the first hand-written questions of every subject,
-- including the Kalchuri history set; this file records it so a fresh database has the same function.

create or replace function public.ex_add_facts(p_org uuid, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $function$
-- rows: [subject, level, class_from, class_to, q_hi, q_en, [opts_hi], [opts_en], correct_index, explanation_hi]
declare r jsonb; n int := 0;
begin
  if not (core.is_platform_admin() or public.ex_can_manage(p_org) or session_user in ('postgres', 'supabase_admin')) then raise exception 'Not allowed'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into public.ex_questions (organization_id, subject, topic, class_from, class_to, difficulty, level, lang, qtype, question, question_hi, options, options_hi, correct, explanation_hi, status, source, qhash)
    values (p_org, r->>0, null, (r->>2)::int, (r->>3)::int, case when (r->>1)::int <= 2 then 'easy' when (r->>1)::int = 3 then 'medium' else 'hard' end, (r->>1)::int, 'hi', 'mcq',
            r->>5, r->>4, r->7, case when r->6 = r->7 then null else r->6 end, jsonb_build_array((r->>8)::int), r->>9, 'active', 'seed', md5((r->>0) || '|' || (r->>5)))
    on conflict do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $function$;
revoke all on function public.ex_add_facts(uuid, jsonb) from public, anon;
grant execute on function public.ex_add_facts(uuid, jsonb) to authenticated;

-- review rows also carry the Hindi explanation
do $$
declare d text;
begin
  d := pg_get_functiondef('public.ex_level_submit(uuid,jsonb)'::regprocedure);
  if position('explanation_hi' in d) = 0 then
    d := replace(d, '''explanation'', x.explanation)', '''explanation'', x.explanation, ''explanation_hi'', x.explanation_hi)');
    execute d;
  end if;
end $$;

-- class 11–12 arts: history/geography/polity/economy questions are not tied to a class, so do not require a class match
update public.ex_tracks set strict_class = false where slug = 'school-11-12-arts';
