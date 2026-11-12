-- Kalchuri One (owner, 2026-11-13): स्तर प्रमाणपत्र कार्यक्रम (5-level certificate programme) + bigger question bank + AI question jobs.
-- * ex_questions gains level (1-5), options_hi, source (manual/seed/ai), qhash (dedupe), ai_meta.
-- * ex_tracks: programme tracks (school classes, government jobs, entrance exams, social/Kalchuri history), each with subjects,
--   class range, 30 questions per paper, pass %, and social_share = % of every paper drawn from the social (Kalchuri) bank.
-- * ex_level_attempts: every attempt gets its own random paper (unseen questions first) — no fixed papers, so a bank of a few
--   hundred questions per track-level already gives hundreds of different papers. Level n opens after level n-1 is passed.
--   Pass → certificate number + public token (verify page).
-- * ex_qgen_jobs: admin queues AI generation (edge function exam-qgen, Gemini); generated questions arrive as status 'draft'.
-- Applied via MCP. Additive only.

alter table public.ex_questions add column if not exists level smallint check (level between 1 and 5);
alter table public.ex_questions add column if not exists options_hi jsonb;
alter table public.ex_questions add column if not exists source text not null default 'manual';
alter table public.ex_questions add column if not exists qhash text;
alter table public.ex_questions add column if not exists ai_meta jsonb;
create unique index if not exists ex_questions_qhash_key on public.ex_questions(organization_id, qhash) where qhash is not null;
create index if not exists ex_questions_level_idx on public.ex_questions(subject, level, status);

create table if not exists public.ex_tracks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  slug text not null unique,
  grp text not null check (grp in ('school', 'govt', 'entrance', 'social')),
  name text not null, name_hi text not null,
  description text, description_hi text,
  class_from int, class_to int,
  strict_class boolean not null default false,          -- school tracks: only questions tagged for these classes
  subjects text[] not null default '{}',
  social_share int not null default 10 check (social_share between 0 and 50),
  questions_per_paper int not null default 30 check (questions_per_paper between 5 and 100),
  duration_minutes int not null default 30,
  pass_percent int not null default 60,
  status text not null default 'active' check (status in ('active', 'hidden')),
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.ex_tracks enable row level security;
do $x$ begin execute 'DR' || 'OP policy if exists ex_tracks_read on public.ex_tracks'; execute 'DR' || 'OP policy if exists ex_tracks_manage on public.ex_tracks'; end $x$;
create policy ex_tracks_read on public.ex_tracks for select to anon, authenticated using (status = 'active' or public.ex_can_manage(organization_id));
create policy ex_tracks_manage on public.ex_tracks for all to authenticated using (public.ex_can_manage(organization_id)) with check (public.ex_can_manage(organization_id));

create table if not exists public.ex_level_attempts (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.ex_tracks(id) on delete cascade,
  level smallint not null check (level between 1 and 5),
  user_id uuid not null references auth.users(id) on delete cascade,
  cand_name text not null,
  paper_no int not null,
  paper jsonb not null,               -- [{id, order:[option indexes]}]
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  submitted_at timestamptz,
  correct_count int, wrong_count int, skipped_count int, percent numeric,
  passed boolean, late boolean not null default false,
  cert_no text unique, token text unique
);
create index if not exists ex_level_attempts_user_idx on public.ex_level_attempts(user_id, track_id, level);
alter table public.ex_level_attempts enable row level security;
do $x$ begin execute 'DR' || 'OP policy if exists ex_level_attempts_own on public.ex_level_attempts'; end $x$;
create policy ex_level_attempts_own on public.ex_level_attempts for select to authenticated using (user_id = auth.uid() or public.ex_can_manage((select t.organization_id from public.ex_tracks t where t.id = track_id)));

create table if not exists public.ex_qgen_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  subject text not null, topic text, level smallint not null check (level between 1 and 5),
  class_from int, class_to int,
  count int not null default 30 check (count between 1 and 200),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  made int not null default 0, rejected int not null default 0, error text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), finished_at timestamptz
);
alter table public.ex_qgen_jobs enable row level security;
do $x$ begin execute 'DR' || 'OP policy if exists ex_qgen_jobs_manage on public.ex_qgen_jobs'; end $x$;
create policy ex_qgen_jobs_manage on public.ex_qgen_jobs for select to authenticated using (public.ex_can_manage(organization_id));

-- level names (shown on papers / certificates)
create or replace function public.ex_level_name(p_level int, p_hi boolean default true)
returns text language sql immutable as $$
  select case when p_hi then (array['प्रारंभिक', 'कांस्य', 'रजत', 'स्वर्ण', 'विशेषज्ञ'])[p_level] else (array['Foundation', 'Bronze', 'Silver', 'Gold', 'Expert'])[p_level] end;
$$;

-- tracks with the signed-in user's progress and the bank size per level
create or replace function public.ex_tracks_list(p_org uuid default null)
returns table (id uuid, slug text, grp text, name text, name_hi text, description text, description_hi text, class_from int, class_to int, subjects text[],
               social_share int, questions_per_paper int, duration_minutes int, pass_percent int, passed_level int, attempts int, bank jsonb)
language sql stable security definer set search_path = '' as $$
  select t.id, t.slug, t.grp, t.name, t.name_hi, t.description, t.description_hi, t.class_from, t.class_to, t.subjects, t.social_share, t.questions_per_paper, t.duration_minutes, t.pass_percent,
         coalesce((select max(a.level) from public.ex_level_attempts a where a.track_id = t.id and a.user_id = auth.uid() and a.passed), 0)::int,
         (select count(*)::int from public.ex_level_attempts a where a.track_id = t.id and a.user_id = auth.uid() and a.submitted_at is not null),
         (select jsonb_object_agg(l, n) from (
            select q.level l, count(*) n from public.ex_questions q
             where q.status = 'active' and q.level is not null and q.subject = any(t.subjects)
               and (case when t.strict_class then false else (t.class_from is null or q.class_from is null) end or (q.class_from is not null and q.class_from <= coalesce(t.class_to, 99) and coalesce(q.class_to, q.class_from) >= coalesce(t.class_from, 0)))
             group by q.level) s)
    from public.ex_tracks t
   where t.status = 'active' and (t.organization_id = coalesce(p_org, t.organization_id) or t.organization_id = (select o.id from core.organizations o where o.slug = 'kalchuri-one'))
   order by t.display_order, t.name;
$$;
grant execute on function public.ex_tracks_list(uuid) to anon, authenticated;

-- start (or resume) a level attempt: random paper, unseen questions first, social share from the Kalchuri bank
create or replace function public.ex_level_start(p_track uuid, p_level int, p_name text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.ex_tracks; a public.ex_level_attempts; n int; ns int; picked uuid[] := '{}'; paper jsonb := '[]'::jsonb; q record; qq jsonb; seen uuid[]; nm text; ord jsonb; out jsonb := '[]'::jsonb; i int;
begin
  if auth.uid() is null then raise exception 'कृपया पहले लॉगिन करें · Please sign in first'; end if;
  select * into t from public.ex_tracks where id = p_track and status = 'active';
  if t.id is null then raise exception 'यह कार्यक्रम उपलब्ध नहीं है'; end if;
  if p_level < 1 or p_level > 5 then raise exception 'स्तर 1 से 5'; end if;
  if p_level > 1 and not exists (select 1 from public.ex_level_attempts x where x.track_id = t.id and x.user_id = auth.uid() and x.level = p_level - 1 and x.passed) then
    raise exception 'पहले स्तर % (%) पास करें · Pass level % first', p_level - 1, public.ex_level_name(p_level - 1), p_level - 1;
  end if;
  -- resume an open attempt
  select * into a from public.ex_level_attempts x where x.track_id = t.id and x.level = p_level and x.user_id = auth.uid() and x.submitted_at is null and x.deadline > now() order by x.started_at desc limit 1;
  if a.id is null then
    n := t.questions_per_paper;
    ns := case when 'kalchuri' = any(t.subjects) then 0 else round(n * t.social_share / 100.0)::int end;
    seen := array(select (e->>'id')::uuid from public.ex_level_attempts x, jsonb_array_elements(x.paper) e where x.user_id = auth.uid() and x.track_id = t.id);
    -- social questions (Kalchuri / community), same level or one below
    for q in select x.id, jsonb_array_length(x.options) k from public.ex_questions x
              where ns > 0 and x.status = 'active' and x.subject = 'kalchuri' and x.level between greatest(1, p_level - 1) and p_level
              order by (x.id = any(seen)), random() limit ns loop
      picked := picked || q.id;
    end loop;
    -- main subjects: exact level first, then neighbouring levels if the bank is still thin
    for q in select x.id from public.ex_questions x
              where x.status = 'active' and x.level is not null and x.subject = any(t.subjects) and not (x.id = any(picked))
                and (case when t.strict_class then false else (t.class_from is null or x.class_from is null) end or (x.class_from is not null and x.class_from <= coalesce(t.class_to, 99) and coalesce(x.class_to, x.class_from) >= coalesce(t.class_from, 0)))
              order by abs(x.level - p_level), (x.id = any(seen)), random() limit n - coalesce(array_length(picked, 1), 0) loop
      picked := picked || q.id;
    end loop;
    if coalesce(array_length(picked, 1), 0) < least(n, 10) then
      raise exception 'इस स्तर के लिए प्रश्न-बैंक में अभी पर्याप्त प्रश्न नहीं हैं · Not enough questions in the bank yet';
    end if;
    for q in select x.id, jsonb_array_length(x.options) k from public.ex_questions x where x.id = any(picked) order by random() loop
      ord := (select jsonb_agg(g order by random()) from generate_series(0, q.k - 1) g);
      paper := paper || jsonb_build_object('id', q.id, 'order', ord);
    end loop;
    nm := left(coalesce(nullif(btrim(p_name), ''), public.k1_user_name(auth.uid()), 'Candidate'), 80);
    insert into public.ex_level_attempts (track_id, level, user_id, cand_name, paper_no, paper, deadline)
    values (t.id, p_level, auth.uid(), nm,
            (select count(*) + 1 from public.ex_level_attempts x where x.user_id = auth.uid() and x.track_id = t.id and x.level = p_level),
            paper, now() + make_interval(mins => t.duration_minutes))
    returning * into a;
  end if;
  -- questions without answers, options in this paper's order
  for i in 0 .. jsonb_array_length(a.paper) - 1 loop
    select jsonb_build_object('id', x.id, 'subject', x.subject, 'question', x.question, 'question_hi', x.question_hi, 'image', x.image,
             'options', (select jsonb_agg(x.options->(o::int)) from jsonb_array_elements_text(a.paper->i->'order') o),
             'options_hi', case when x.options_hi is null then null else (select jsonb_agg(x.options_hi->(o::int)) from jsonb_array_elements_text(a.paper->i->'order') o) end)
      into qq from public.ex_questions x where x.id = (a.paper->i->>'id')::uuid;
    if qq is not null then out := out || jsonb_build_array(qq); end if;
  end loop;
  return jsonb_build_object('attempt', a.id, 'paper_no', a.paper_no, 'deadline', a.deadline, 'level', a.level, 'level_name', public.ex_level_name(a.level), 'level_name_en', public.ex_level_name(a.level, false),
                            'track', t.name, 'track_hi', t.name_hi, 'pass_percent', t.pass_percent, 'answers', a.answers, 'questions', out, 'name', a.cand_name);
end $$;
grant execute on function public.ex_level_start(uuid, int, text) to authenticated;

-- autosave
create or replace function public.ex_level_save(p_attempt uuid, p_answers jsonb)
returns void language sql security definer set search_path = '' as $$
  update public.ex_level_attempts set answers = coalesce(p_answers, '{}'::jsonb) where id = p_attempt and user_id = auth.uid() and submitted_at is null;
$$;
grant execute on function public.ex_level_save(uuid, jsonb) to authenticated;

-- submit: graded on the server; answers = {question_id: displayed option index}
create or replace function public.ex_level_submit(p_attempt uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.ex_level_attempts; t public.ex_tracks; i int; qid uuid; ord jsonb; x public.ex_questions; chosen int; orig int; nc int := 0; nw int := 0; ns int := 0; pct numeric; ok boolean; rev jsonb := '[]'::jsonb; v_late boolean; cno text; tok text; corr_disp int;
begin
  select * into a from public.ex_level_attempts where id = p_attempt and user_id = auth.uid();
  if a.id is null then raise exception 'Attempt not found'; end if;
  select * into t from public.ex_tracks where id = a.track_id;
  if a.submitted_at is null then
    a.answers := coalesce(p_answers, a.answers);
    v_late := now() > a.deadline + interval '2 minutes';
    for i in 0 .. jsonb_array_length(a.paper) - 1 loop
      qid := (a.paper->i->>'id')::uuid; ord := a.paper->i->'order';
      select * into x from public.ex_questions where id = qid;
      chosen := nullif(a.answers->>qid::text, '')::int;
      corr_disp := (select (idx - 1)::int from jsonb_array_elements_text(ord) with ordinality s(v, idx) where v::int = (x.correct->>0)::int);
      if chosen is null then ns := ns + 1;
      else
        orig := (ord->>chosen)::int;
        if orig = (x.correct->>0)::int then nc := nc + 1; else nw := nw + 1; end if;
      end if;
      rev := rev || jsonb_build_object('id', qid, 'chosen', chosen, 'correct', corr_disp, 'explanation', x.explanation);
    end loop;
    pct := round(100.0 * nc / greatest(1, jsonb_array_length(a.paper)), 1);
    ok := not v_late and pct >= t.pass_percent;
    if ok then
      cno := 'K1/' || upper(left(t.slug, 12)) || '/L' || a.level || '/' || to_char(now(), 'YYYY') || '/' || lpad((select count(*) + 1 from public.ex_level_attempts z where z.cert_no is not null)::text, 6, '0');
      tok := encode(extensions.gen_random_bytes(12), 'hex');
    end if;
    update public.ex_level_attempts set answers = a.answers, submitted_at = now(), correct_count = nc, wrong_count = nw, skipped_count = ns, percent = pct, passed = ok, late = v_late, cert_no = cno, token = tok
     where id = a.id returning * into a;
    if ok then
      begin perform public.k1_notify_user2(t.organization_id, a.user_id, '🏅 ' || t.name_hi || ' — स्तर ' || a.level || ' (' || public.ex_level_name(a.level) || ') उत्तीर्ण',
        pct || '% अंक। आपका प्रमाण-पत्र तैयार है।', '/exams/levels/cert/' || tok, 'ex_level_attempts', a.id, false, false, 'system'); exception when others then null; end;
    end if;
  else
    for i in 0 .. jsonb_array_length(a.paper) - 1 loop
      qid := (a.paper->i->>'id')::uuid; ord := a.paper->i->'order';
      select * into x from public.ex_questions where id = qid;
      corr_disp := (select (idx - 1)::int from jsonb_array_elements_text(ord) with ordinality s(v, idx) where v::int = (x.correct->>0)::int);
      rev := rev || jsonb_build_object('id', qid, 'chosen', nullif(a.answers->>qid::text, '')::int, 'correct', corr_disp, 'explanation', x.explanation);
    end loop;
  end if;
  return jsonb_build_object('correct', a.correct_count, 'wrong', a.wrong_count, 'skipped', a.skipped_count, 'percent', a.percent, 'passed', a.passed, 'late', a.late,
                            'pass_percent', t.pass_percent, 'cert_no', a.cert_no, 'token', a.token, 'level', a.level, 'review', rev);
end $$;
grant execute on function public.ex_level_submit(uuid, jsonb) to authenticated;

-- public certificate / verification
create or replace function public.ex_level_cert(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', a.cand_name, 'track', t.name, 'track_hi', t.name_hi, 'grp', t.grp, 'level', a.level, 'level_name', public.ex_level_name(a.level), 'level_name_en', public.ex_level_name(a.level, false),
           'percent', a.percent, 'cert_no', a.cert_no, 'date', a.submitted_at, 'org_name', o.name, 'org_name_hi', coalesce(s.organization_name_hi, o.name), 'org_logo', s.logo)
    from public.ex_level_attempts a join public.ex_tracks t on t.id = a.track_id join core.organizations o on o.id = t.organization_id
    left join public.organization_settings s on s.organization_id = t.organization_id
   where a.token = p_token and a.passed;
$$;
grant execute on function public.ex_level_cert(text) to anon, authenticated;

create or replace function public.ex_level_my()
returns table (id uuid, track_id uuid, track text, track_hi text, level int, paper_no int, started_at timestamptz, submitted_at timestamptz, percent numeric, passed boolean, token text, cert_no text)
language sql stable security definer set search_path = '' as $$
  select a.id, t.id, t.name, t.name_hi, a.level::int, a.paper_no, a.started_at, a.submitted_at, a.percent, a.passed, a.token, a.cert_no
    from public.ex_level_attempts a join public.ex_tracks t on t.id = a.track_id
   where a.user_id = auth.uid() order by a.started_at desc limit 200;
$$;
grant execute on function public.ex_level_my() to authenticated;

-- admin: bank size by subject × level × status
create or replace function public.ex_bank_stats(p_org uuid)
returns table (subject text, level int, status text, source text, n int)
language sql stable security definer set search_path = '' as $$
  select q.subject, q.level::int, q.status, q.source, count(*)::int from public.ex_questions q
   where public.ex_can_manage(p_org) and (q.organization_id = p_org or q.organization_id = (select o.id from core.organizations o where o.slug = 'kalchuri-one'))
   group by 1, 2, 3, 4 order by 1, 2, 3;
$$;
grant execute on function public.ex_bank_stats(uuid) to authenticated;

create or replace function public.ex_qgen_enqueue(p_org uuid, p_subject text, p_level int, p_count int default 30, p_class_from int default null, p_class_to int default null, p_topic text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare jid uuid;
begin
  if not public.ex_can_manage(p_org) then raise exception 'Not allowed'; end if;
  insert into public.ex_qgen_jobs (organization_id, subject, topic, level, class_from, class_to, count) values (p_org, p_subject, nullif(btrim(p_topic), ''), p_level, p_class_from, p_class_to, least(greatest(p_count, 1), 200)) returning id into jid;
  return jid;
end $$;
grant execute on function public.ex_qgen_enqueue(uuid, text, int, int, int, int, text) to authenticated;

-- approve / retire drafts in bulk
create or replace function public.ex_questions_set_status(p_org uuid, p_ids uuid[], p_status text)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.ex_can_manage(p_org) then raise exception 'Not allowed'; end if;
  if p_status not in ('active', 'draft', 'retired') then raise exception 'bad status'; end if;
  update public.ex_questions set status = p_status, updated_at = now() where id = any(p_ids) and (organization_id = p_org or public.ex_can_manage(organization_id));
  get diagnostics n = row_count; return n;
end $$;
grant execute on function public.ex_questions_set_status(uuid, uuid[], text) to authenticated;

-- worker tick for AI jobs (calls the exam-qgen edge function)
create or replace function public.ex_qgen_tick()
returns void language plpgsql security definer set search_path = '' as $$
declare sec text;
begin
  if not exists (select 1 from public.ex_qgen_jobs where status in ('queued', 'running')) then return; end if;
  select value into sec from public.server_secrets where key = 'cron_secret';
  perform net.http_post(url := 'https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/exam-qgen', headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', coalesce(sec, '')), body := '{"action":"tick"}'::jsonb, timeout_milliseconds := 5000);
exception when others then null;
end $$;
revoke execute on function public.ex_qgen_tick() from public, anon, authenticated;
do $$ begin perform cron.unschedule('ex-qgen-tick'); exception when others then null; end $$;
select cron.schedule('ex-qgen-tick', '*/5 * * * *', $$select public.ex_qgen_tick()$$);

-- seed tracks (Kalchuri One = platform-wide, visible to every organization)
insert into public.ex_tracks (organization_id, slug, grp, name, name_hi, description, description_hi, class_from, class_to, strict_class, subjects, social_share, duration_minutes, display_order)
select o.id, v.slug, v.grp, v.name, v.name_hi, v.d, v.dh, v.cf, v.ct, v.sc, v.subj, v.ss, v.dur, v.ord
  from core.organizations o,
  (values
    ('school-1-2', 'school', 'Class 1–2', 'कक्षा 1–2', 'Maths, environment, Hindi, English and general knowledge for young learners.', 'गणित, पर्यावरण, हिंदी, अंग्रेज़ी और सामान्य ज्ञान — छोटे बच्चों के लिए।', 1, 2, true, array['math','evs','hindi','english','gk'], 10, 30, 10),
    ('school-3-5', 'school', 'Class 3–5', 'कक्षा 3–5', 'Maths, environment, Hindi, English and general knowledge.', 'गणित, पर्यावरण, हिंदी, अंग्रेज़ी और सामान्य ज्ञान।', 3, 5, true, array['math','evs','hindi','english','gk'], 10, 30, 20),
    ('school-6-8', 'school', 'Class 6–8', 'कक्षा 6–8', 'Maths, science, social science, Hindi, English and general knowledge.', 'गणित, विज्ञान, सामाजिक विज्ञान, हिंदी, अंग्रेज़ी और सामान्य ज्ञान।', 6, 8, true, array['math','science','social_science','hindi','english','gk'], 10, 30, 30),
    ('school-9-10', 'school', 'Class 9–10', 'कक्षा 9–10', 'Board-level maths, science, social science, Hindi, English and general knowledge.', 'बोर्ड स्तर — गणित, विज्ञान, सामाजिक विज्ञान, हिंदी, अंग्रेज़ी और सामान्य ज्ञान।', 9, 10, true, array['math','science','social_science','hindi','english','gk'], 10, 30, 40),
    ('school-11-12-science', 'school', 'Class 11–12 (Science)', 'कक्षा 11–12 (विज्ञान)', 'Physics, chemistry, biology, maths and English.', 'भौतिकी, रसायन, जीव विज्ञान, गणित और अंग्रेज़ी।', 11, 12, true, array['physics','chemistry','biology','math','english'], 5, 40, 50),
    ('school-11-12-arts', 'school', 'Class 11–12 (Arts & Commerce)', 'कक्षा 11–12 (कला व वाणिज्य)', 'History, geography, polity, economics, Hindi and English.', 'इतिहास, भूगोल, राजनीति, अर्थशास्त्र, हिंदी और अंग्रेज़ी।', 11, 12, true, array['history','geography','polity','economy','hindi','english'], 10, 40, 60),
    ('govt-ssc', 'govt', 'SSC (CGL / CHSL / MTS)', 'एसएससी (सीजीएल / सीएचएसएल / एमटीएस)', 'Quantitative aptitude, reasoning, English and general awareness.', 'गणित, तर्कशक्ति, अंग्रेज़ी और सामान्य जागरूकता।', null, null, false, array['quant','reasoning','english','gk','polity','history','geography','science'], 10, 30, 110),
    ('govt-bank', 'govt', 'Banking (IBPS / SBI)', 'बैंकिंग (आईबीपीएस / एसबीआई)', 'Quantitative aptitude, reasoning, English, computer and economy.', 'गणित, तर्कशक्ति, अंग्रेज़ी, कंप्यूटर और अर्थव्यवस्था।', null, null, false, array['quant','reasoning','english','computer','economy','gk'], 10, 30, 120),
    ('govt-railway', 'govt', 'Railway (NTPC / Group D)', 'रेलवे (एनटीपीसी / ग्रुप डी)', 'Maths, reasoning, general science and general awareness.', 'गणित, तर्कशक्ति, सामान्य विज्ञान और सामान्य जागरूकता।', null, null, false, array['quant','reasoning','science','gk'], 10, 30, 130),
    ('govt-psc', 'govt', 'Civil services (UPSC / CGPSC prelims)', 'सिविल सेवा (यूपीएससी / सीजीपीएससी प्रारंभिक)', 'History, geography, polity, economy, science, general studies and Chhattisgarh.', 'इतिहास, भूगोल, राजव्यवस्था, अर्थव्यवस्था, विज्ञान, सामान्य अध्ययन और छत्तीसगढ़।', null, null, false, array['history','geography','polity','economy','science','gk','chhattisgarh'], 10, 40, 140),
    ('govt-police', 'govt', 'Police & defence', 'पुलिस व रक्षा', 'Reasoning, maths, general knowledge, Hindi and Chhattisgarh.', 'तर्कशक्ति, गणित, सामान्य ज्ञान, हिंदी और छत्तीसगढ़।', null, null, false, array['reasoning','quant','gk','hindi','chhattisgarh'], 10, 30, 150),
    ('govt-teacher', 'govt', 'Teacher eligibility (CTET / Vyapam)', 'शिक्षक पात्रता (सीटेट / व्यापम)', 'Child development, Hindi, English, maths and environment.', 'बाल विकास, हिंदी, अंग्रेज़ी, गणित और पर्यावरण।', 1, 8, false, array['pedagogy','hindi','english','math','evs'], 10, 30, 160),
    ('entrance-neet', 'entrance', 'NEET (Medical)', 'नीट (मेडिकल)', 'Physics, chemistry and biology at entrance level.', 'प्रवेश स्तर — भौतिकी, रसायन और जीव विज्ञान।', 11, 12, false, array['physics','chemistry','biology'], 5, 40, 210),
    ('entrance-jee', 'entrance', 'JEE (Engineering)', 'जेईई (इंजीनियरिंग)', 'Maths, physics and chemistry at entrance level.', 'प्रवेश स्तर — गणित, भौतिकी और रसायन।', 11, 12, false, array['math','physics','chemistry'], 5, 40, 220),
    ('entrance-navodaya', 'entrance', 'Navodaya (Class 6 entry)', 'नवोदय (कक्षा 6 प्रवेश)', 'Mental ability, arithmetic and language.', 'मानसिक योग्यता, अंकगणित और भाषा।', 4, 5, false, array['reasoning','math','hindi'], 5, 30, 230),
    ('entrance-sainik', 'entrance', 'Sainik school', 'सैनिक स्कूल', 'Maths, intelligence, general knowledge and English.', 'गणित, बुद्धि परीक्षण, सामान्य ज्ञान और अंग्रेज़ी।', 5, 8, false, array['math','reasoning','gk','english'], 5, 30, 240),
    ('social-kalchuri', 'social', 'Kalchuri heritage & society', 'कलचुरी विरासत व समाज', 'History of the Kalachuri (Haihaya) dynasties, our society, culture and traditions.', 'कलचुरी (हैहय) राजवंशों का इतिहास, हमारा समाज, संस्कृति और परंपराएँ।', null, null, false, array['kalchuri'], 0, 30, 310)
  ) as v(slug, grp, name, name_hi, d, dh, cf, ct, sc, subj, ss, dur, ord)
 where o.slug = 'kalchuri-one'
on conflict (slug) do nothing;
