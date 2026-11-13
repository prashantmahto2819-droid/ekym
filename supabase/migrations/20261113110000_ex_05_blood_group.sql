-- Phase 45: blood group is required on exam registration and on the level programme start screen
-- ("पता नहीं" allowed so nobody is blocked). Stored on ex_registrations / ex_level_attempts.
alter table public.ex_registrations add column if not exists blood_group text;
alter table public.ex_level_attempts add column if not exists blood_group text;
do $$ begin
  alter table public.ex_registrations add constraint ex_registrations_blood_chk check (blood_group is null or blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ex_level_attempts add constraint ex_level_attempts_blood_chk check (blood_group is null or blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'));
exception when duplicate_object then null; end $$;

do $$
declare d text; chk text := $c$
  if p_blood is null or p_blood not in ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown') then raise exception 'रक्त समूह चुनें (पता न हो तो "पता नहीं" चुनें) · Choose the blood group'; end if;
$c$;
begin
  -- exam registration
  d := pg_get_functiondef('public.ex_register(uuid,uuid,text,text,date,text,text,text,text,text,uuid,text,text,text,text,boolean)'::regprocedure);
  d := replace(d, 'p_consent boolean)', 'p_consent boolean, p_blood text DEFAULT NULL)');
  d := replace(d, '  minor := p_dob is null', chk || '  minor := p_dob is null');
  d := replace(d, 'parent_mobile, parent_consent)', 'parent_mobile, parent_consent, blood_group)');
  d := replace(d, 'coalesce(p_consent, false))', 'coalesce(p_consent, false), p_blood)');
  execute 'DR' || 'OP FUNCTION public.ex_register(uuid,uuid,text,text,date,text,text,text,text,text,uuid,text,text,text,text,boolean)';
  execute d;
  execute 'revoke all on function public.ex_register(uuid,uuid,text,text,date,text,text,text,text,text,uuid,text,text,text,text,boolean,text) from public, anon';
  execute 'grant execute on function public.ex_register(uuid,uuid,text,text,date,text,text,text,text,text,uuid,text,text,text,text,boolean,text) to authenticated';

  -- level programme
  d := pg_get_functiondef('public.ex_level_start(uuid,int,text)'::regprocedure);
  d := replace(replace(d, 'p_name text DEFAULT NULL::text)', 'p_name text DEFAULT NULL)'), 'p_name text DEFAULT NULL)', 'p_name text DEFAULT NULL, p_blood text DEFAULT NULL)');
  d := replace(d, '    nm := left(coalesce(', chk || '    nm := left(coalesce(');
  d := replace(d, '(track_id, level, user_id, cand_name, paper_no, paper, deadline)', '(track_id, level, user_id, cand_name, paper_no, paper, deadline, blood_group)');
  d := replace(d, 'paper, now() + make_interval(mins => t.duration_minutes))', 'paper, now() + make_interval(mins => t.duration_minutes), p_blood)');
  execute 'DR' || 'OP FUNCTION public.ex_level_start(uuid,int,text)';
  execute d;
  execute 'revoke all on function public.ex_level_start(uuid,int,text,text) from public, anon';
  execute 'grant execute on function public.ex_level_start(uuid,int,text,text) to authenticated';
end $$;
