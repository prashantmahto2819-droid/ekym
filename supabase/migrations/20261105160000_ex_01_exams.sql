-- Kalchuri One · परीक्षा / प्रतियोगिता (restructured from Charameti's comp_* / ts_* design):
-- platform-level exams (owned by Kalchuri One, optionally by an organization), class-wise categories, a shared question bank,
-- online MCQ papers graded on the server (correct answers never leave the database), tab-switch flags, results, ranks,
-- certificates with public verification. Children (under 18) register with a parent/guardian name, mobile and consent;
-- the signed-in account may be the parent's. Written/drawing entries with judges come in a later phase.

create table if not exists public.ex_exams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,   -- root = platform-wide
  slug text not null,
  title text not null, title_hi text,
  summary text, summary_hi text, rules text, rules_hi text,
  cover_image text,
  kind text not null default 'competition' check (kind in ('competition','practice')),
  status text not null default 'draft' check (status in ('draft','open','running','closed','results')),
  languages text[] not null default array['hi','en'],
  reg_opens_at timestamptz, reg_closes_at timestamptz,
  starts_at timestamptz, ends_at timestamptz,
  duration_minutes int not null default 30,
  negative_mark numeric not null default 0,
  shuffle boolean not null default true,
  max_tab_switches int not null default 3,
  show_answers_after boolean not null default true,
  pass_percent int not null default 40,
  winners int not null default 3,
  cert_participation boolean not null default true, cert_merit boolean not null default true,
  results_at timestamptz,
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create table if not exists public.ex_categories (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.ex_exams(id) on delete cascade,
  name text not null, name_hi text,
  class_from int, class_to int,
  questions_per_paper int not null default 20,
  display_order int not null default 0
);
create table if not exists public.ex_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  subject text not null, topic text,
  class_from int, class_to int,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  lang text not null default 'hi',
  qtype text not null default 'mcq' check (qtype in ('mcq','multi','truefalse')),
  question text not null, question_hi text, image text,
  options jsonb not null default '[]'::jsonb,      -- ["…","…","…","…"]
  correct jsonb not null default '[]'::jsonb,      -- [index] or [i,j]
  explanation text,
  status text not null default 'active' check (status in ('draft','active','retired')),
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ex_questions_org_idx on public.ex_questions(organization_id, subject, class_from, class_to, status);
create table if not exists public.ex_paper_questions (
  exam_id uuid not null references public.ex_exams(id) on delete cascade,
  category_id uuid references public.ex_categories(id) on delete cascade,
  question_id uuid not null references public.ex_questions(id) on delete cascade,
  marks numeric not null default 1,
  primary key (exam_id, question_id)
);
create table if not exists public.ex_registrations (
  id uuid primary key default gen_random_uuid(),
  reg_no text,
  exam_id uuid not null references public.ex_exams(id) on delete cascade,
  category_id uuid references public.ex_categories(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,     -- student's or parent's account
  student_name text not null, student_name_hi text,
  date_of_birth date, gender text, is_minor boolean not null default false,
  class_level text, school text, city text, district text,
  member_org uuid references core.organizations(id) on delete set null,   -- which samaj/organization the student belongs to
  lang text not null default 'hi',
  mobile text, parent_name text, parent_mobile text, parent_consent boolean not null default false,
  status text not null default 'registered' check (status in ('registered','cancelled','disqualified')),
  public_token text not null default encode(gen_random_bytes(9), 'hex'),
  score numeric, max_score numeric, percent numeric, rank int, result text,   -- pass | fail | merit
  cert_no text, cert_issued_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (exam_id, user_id, student_name)
);
create index if not exists ex_reg_exam_idx on public.ex_registrations(exam_id, category_id, percent desc);
create table if not exists public.ex_attempts (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.ex_registrations(id) on delete cascade,
  practice boolean not null default false,
  paper jsonb not null default '[]'::jsonb,       -- [{q:uuid, marks, order:[option indexes]}]
  answers jsonb not null default '{}'::jsonb,     -- {q: [chosen option indexes]}
  started_at timestamptz not null default now(), deadline_at timestamptz not null, submitted_at timestamptz,
  auto_submitted boolean not null default false, tab_switches int not null default 0, flags jsonb not null default '[]'::jsonb,
  score numeric, max_score numeric, correct_count int, wrong_count int, skipped_count int, time_taken_s int,
  review jsonb                                     -- filled at submit when show_answers_after: [{q, chosen, correct, marks_got, explanation}]
);
create index if not exists ex_attempts_reg_idx on public.ex_attempts(registration_id, practice, started_at desc);

alter table public.ex_exams enable row level security;
alter table public.ex_categories enable row level security;
alter table public.ex_questions enable row level security;
alter table public.ex_paper_questions enable row level security;
alter table public.ex_registrations enable row level security;
alter table public.ex_attempts enable row level security;

-- permission: exam.manage (platform admins; org admins with * ) — register it
insert into core.permissions(key, module, label, label_hi) values ('exam.manage', 'exam', 'Manage exams and question bank', 'परीक्षा व प्रश्न-बैंक प्रबंधन')
on conflict (key) do nothing;

create or replace function public.ex_can_manage(p_org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_platform_admin() or core.can(p_org, 'exam.manage');
$$;

create policy ex_exams_public on public.ex_exams for select to anon, authenticated using (status <> 'draft');
create policy ex_exams_manage on public.ex_exams for all to authenticated using (public.ex_can_manage(organization_id)) with check (public.ex_can_manage(organization_id));
create policy ex_cat_public on public.ex_categories for select to anon, authenticated using (exists (select 1 from public.ex_exams e where e.id = exam_id and e.status <> 'draft'));
create policy ex_cat_manage on public.ex_categories for all to authenticated using (exists (select 1 from public.ex_exams e where e.id = exam_id and public.ex_can_manage(e.organization_id))) with check (exists (select 1 from public.ex_exams e where e.id = exam_id and public.ex_can_manage(e.organization_id)));
-- questions: only managers (the bank is never readable by candidates; papers are served via RPC without answers)
create policy ex_q_manage on public.ex_questions for all to authenticated using (public.ex_can_manage(organization_id)) with check (public.ex_can_manage(organization_id));
create policy ex_pq_manage on public.ex_paper_questions for all to authenticated using (exists (select 1 from public.ex_exams e where e.id = exam_id and public.ex_can_manage(e.organization_id))) with check (exists (select 1 from public.ex_exams e where e.id = exam_id and public.ex_can_manage(e.organization_id)));
create policy ex_reg_own on public.ex_registrations for select to authenticated using (user_id = (select auth.uid()));
create policy ex_reg_manage on public.ex_registrations for all to authenticated using (exists (select 1 from public.ex_exams e where e.id = exam_id and public.ex_can_manage(e.organization_id))) with check (exists (select 1 from public.ex_exams e where e.id = exam_id and public.ex_can_manage(e.organization_id)));
create policy ex_att_own on public.ex_attempts for select to authenticated using (exists (select 1 from public.ex_registrations r where r.id = registration_id and r.user_id = (select auth.uid())));
create policy ex_att_manage on public.ex_attempts for all to authenticated using (exists (select 1 from public.ex_registrations r join public.ex_exams e on e.id = r.exam_id where r.id = registration_id and public.ex_can_manage(e.organization_id)));

create trigger trg_ex_exams_updated before update on public.ex_exams for each row execute function public.set_updated_at();
create trigger trg_ex_questions_updated before update on public.ex_questions for each row execute function public.set_updated_at();

-- ---------- registration (child-safe) ----------
create or replace function public.ex_register(p_exam uuid, p_category uuid, p_student text, p_student_hi text, p_dob date, p_gender text, p_class text, p_school text, p_city text, p_district text, p_org uuid, p_lang text, p_mobile text, p_parent_name text, p_parent_mobile text, p_consent boolean)
returns public.ex_registrations language plpgsql security definer set search_path = '' as $$
declare e public.ex_exams; r public.ex_registrations; minor boolean; n int;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into e from public.ex_exams where id = p_exam;
  if e is null or e.status not in ('open', 'running') then raise exception 'पंजीयन अभी खुला नहीं है'; end if;
  if e.reg_opens_at is not null and now() < e.reg_opens_at then raise exception 'पंजीयन % से खुलेगा', to_char(e.reg_opens_at, 'DD.MM.YYYY HH24:MI'); end if;
  if e.reg_closes_at is not null and now() > e.reg_closes_at then raise exception 'पंजीयन बंद हो चुका है'; end if;
  if length(trim(coalesce(p_student, ''))) < 2 then raise exception 'विद्यार्थी का नाम लिखें'; end if;
  minor := p_dob is null or p_dob > current_date - interval '18 years';
  if minor and (coalesce(trim(p_parent_name), '') = '' or coalesce(trim(p_parent_mobile), '') = '' or not p_consent) then
    raise exception '18 वर्ष से कम आयु के विद्यार्थी के लिए अभिभावक का नाम, मोबाइल और सहमति ज़रूरी है';
  end if;
  select count(*) into n from public.ex_registrations x where x.exam_id = p_exam;
  insert into public.ex_registrations(reg_no, exam_id, category_id, user_id, student_name, student_name_hi, date_of_birth, gender, is_minor, class_level, school, city, district, member_org, lang, mobile, parent_name, parent_mobile, parent_consent)
  values (upper(left(e.slug, 3)) || '-' || to_char(now(), 'YY') || '-' || lpad((n + 1)::text, 4, '0'), p_exam, p_category, auth.uid(), trim(p_student), nullif(trim(p_student_hi), ''), p_dob, p_gender, minor, p_class, p_school, p_city, p_district, p_org, coalesce(p_lang, 'hi'), public.k1_norm_contact(coalesce(p_mobile, '')), nullif(trim(p_parent_name), ''), nullif(public.k1_norm_contact(coalesce(p_parent_mobile, '')), ''), coalesce(p_consent, false))
  returning * into r;
  perform public.k1_notify_user(e.organization_id, auth.uid(), '📝 ' || coalesce(e.title_hi, e.title) || ' — पंजीयन हो गया',
    'विद्यार्थी: ' || r.student_name || E'\n' || 'पंजीयन क्रमांक: ' || r.reg_no || coalesce(E'\n' || 'परीक्षा: ' || to_char(e.starts_at at time zone 'Asia/Kolkata', 'DD.MM.YYYY HH24:MI') || ' बजे से', '') || E'\n' || 'परीक्षा के समय इसी खाते से लॉगिन करके "परीक्षा शुरू करें" दबाएँ।',
    '/exams/' || e.slug, 'ex_registrations', r.id);
  return r;
end $$;
grant execute on function public.ex_register(uuid, uuid, text, text, date, text, text, text, text, text, uuid, text, text, text, text, boolean) to authenticated;

-- ---------- paper: built on the server, served WITHOUT correct answers ----------
create or replace function public.ex_start(p_registration uuid, p_practice boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.ex_registrations; e public.ex_exams; c public.ex_categories; a public.ex_attempts; paper jsonb; q record; qj jsonb; ord int[]; i int; qs jsonb := '[]'::jsonb; n int; pq jsonb := '[]'::jsonb;
begin
  select * into r from public.ex_registrations where id = p_registration and user_id = auth.uid();
  if r is null then raise exception 'पंजीयन नहीं मिला'; end if;
  if r.status <> 'registered' then raise exception 'पंजीयन % है', r.status; end if;
  select * into e from public.ex_exams where id = r.exam_id;
  select * into c from public.ex_categories where id = r.category_id;
  if not p_practice then
    if e.status <> 'running' and not (e.status = 'open' and e.starts_at is not null and now() >= e.starts_at) then raise exception 'परीक्षा अभी शुरू नहीं हुई'; end if;
    if e.ends_at is not null and now() > e.ends_at then raise exception 'परीक्षा का समय समाप्त'; end if;
    -- resume an open attempt
    select * into a from public.ex_attempts where registration_id = r.id and not practice and submitted_at is null and deadline_at > now() order by started_at desc limit 1;
    if a is not null then paper := a.paper; else
      if exists (select 1 from public.ex_attempts where registration_id = r.id and not practice) then raise exception 'आप यह परीक्षा दे चुके हैं'; end if;
    end if;
  end if;
  if a is null then
    n := coalesce(c.questions_per_paper, 20);
    for q in select pq.question_id, pq.marks, jsonb_array_length(x.options) nopt from public.ex_paper_questions pq join public.ex_questions x on x.id = pq.question_id
              where pq.exam_id = e.id and (pq.category_id is null or pq.category_id = r.category_id) and x.status = 'active' order by random() limit n loop
      ord := array(select g from generate_series(0, q.nopt - 1) g);
      if e.shuffle then ord := array(select g from unnest(ord) g order by random()); end if;
      pq := pq || jsonb_build_object('q', q.question_id, 'marks', q.marks, 'order', to_jsonb(ord));
    end loop;
    if jsonb_array_length(pq) = 0 then raise exception 'इस श्रेणी के लिए प्रश्न-पत्र तैयार नहीं है'; end if;
    insert into public.ex_attempts(registration_id, practice, paper, deadline_at) values (r.id, p_practice, pq, now() + make_interval(mins => e.duration_minutes)) returning * into a;
    paper := pq;
  end if;
  -- questions without answers, options in the attempt's order
  for i in 0 .. jsonb_array_length(paper) - 1 loop
    select jsonb_build_object('id', x.id, 'qtype', x.qtype, 'question', x.question, 'question_hi', x.question_hi, 'image', x.image, 'marks', paper->i->'marks',
             'options', (select jsonb_agg(x.options->(o::int)) from jsonb_array_elements_text(paper->i->'order') o))
      into qj from public.ex_questions x where x.id = (paper->i->>'q')::uuid;
    qs := qs || jsonb_build_array(qj);
  end loop;
  return jsonb_build_object('attempt', a.id, 'deadline_at', a.deadline_at, 'duration_minutes', e.duration_minutes, 'negative_mark', e.negative_mark, 'max_tab_switches', e.max_tab_switches, 'answers', a.answers, 'tab_switches', a.tab_switches, 'questions', qs, 'practice', p_practice);
end $$;
grant execute on function public.ex_start(uuid, boolean) to authenticated;

-- save answers as the candidate goes (and count tab switches)
create or replace function public.ex_save(p_attempt uuid, p_answers jsonb, p_tab_switches int default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.ex_attempts a set answers = coalesce(p_answers, a.answers), tab_switches = greatest(a.tab_switches, coalesce(p_tab_switches, a.tab_switches))
   where a.id = p_attempt and a.submitted_at is null and exists (select 1 from public.ex_registrations r where r.id = a.registration_id and r.user_id = auth.uid());
end $$;
grant execute on function public.ex_save(uuid, jsonb, int) to authenticated;

-- grade on the server
create or replace function public.ex_submit(p_attempt uuid, p_answers jsonb default null, p_auto boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.ex_attempts; r public.ex_registrations; e public.ex_exams; i int; qid uuid; x public.ex_questions; chosen jsonb; ord jsonb; corr jsonb; chosen_orig jsonb; got numeric; marks numeric;
        total numeric := 0; maxs numeric := 0; nc int := 0; nw int := 0; ns int := 0; rev jsonb := '[]'::jsonb;
begin
  select * into a from public.ex_attempts where id = p_attempt;
  if a is null then raise exception 'Attempt not found'; end if;
  select * into r from public.ex_registrations where id = a.registration_id;
  if r.user_id <> auth.uid() and not public.ex_can_manage((select organization_id from public.ex_exams where id = r.exam_id)) then raise exception 'Not allowed'; end if;
  if a.submitted_at is not null then return jsonb_build_object('score', a.score, 'max_score', a.max_score, 'correct', a.correct_count, 'wrong', a.wrong_count, 'skipped', a.skipped_count, 'review', a.review); end if;
  select * into e from public.ex_exams where id = r.exam_id;
  if p_answers is not null then a.answers := p_answers; end if;
  for i in 0 .. jsonb_array_length(a.paper) - 1 loop
    qid := (a.paper->i->>'q')::uuid; marks := (a.paper->i->>'marks')::numeric; ord := a.paper->i->'order';
    select * into x from public.ex_questions where id = qid;
    maxs := maxs + marks;
    chosen := a.answers->(qid::text);
    if chosen is null or jsonb_array_length(chosen) = 0 then ns := ns + 1; got := 0;
    else
      -- map displayed indexes back to original option indexes
      select jsonb_agg((ord->(c::int))::int order by (ord->(c::int))::int) into chosen_orig from jsonb_array_elements_text(chosen) c;
      corr := (select jsonb_agg(v::int order by v::int) from jsonb_array_elements_text(x.correct) v);
      if chosen_orig = corr then nc := nc + 1; got := marks; else nw := nw + 1; got := -coalesce(e.negative_mark, 0); end if;
    end if;
    total := total + got;
    rev := rev || jsonb_build_object('q', qid, 'chosen', chosen, 'correct', (select jsonb_agg(idx - 1) from jsonb_array_elements_text(ord) with ordinality t(v, idx) where (v::int) = any (select (c::int) from jsonb_array_elements_text(x.correct) c)) , 'got', got, 'marks', marks, 'explanation', x.explanation);
  end loop;
  update public.ex_attempts set answers = a.answers, submitted_at = now(), auto_submitted = p_auto, score = total, max_score = maxs, correct_count = nc, wrong_count = nw, skipped_count = ns,
         time_taken_s = extract(epoch from now() - started_at)::int, review = case when e.show_answers_after or a.practice then rev else null end
   where id = p_attempt;
  if not a.practice then
    update public.ex_registrations set score = total, max_score = maxs, percent = case when maxs > 0 then round(total / maxs * 100, 2) else 0 end where id = r.id;
  end if;
  return jsonb_build_object('score', total, 'max_score', maxs, 'correct', nc, 'wrong', nw, 'skipped', ns, 'review', case when e.show_answers_after or a.practice then rev else null end);
end $$;
grant execute on function public.ex_submit(uuid, jsonb, boolean) to authenticated;

-- ---------- results, ranks, certificates (managers) ----------
create or replace function public.ex_compute_results(p_exam uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare e public.ex_exams; n int := 0; r record; rk int; prev_cat uuid := null; cert_count int := 0;
begin
  select * into e from public.ex_exams where id = p_exam;
  if e is null or not public.ex_can_manage(e.organization_id) then raise exception 'Not allowed'; end if;
  for r in select x.id, x.category_id, x.percent from public.ex_registrations x where x.exam_id = p_exam and x.status = 'registered' and x.percent is not null order by x.category_id, x.percent desc, x.score desc, x.created_at loop
    if r.category_id is distinct from prev_cat then rk := 0; prev_cat := r.category_id; end if;
    rk := rk + 1;
    update public.ex_registrations set rank = rk,
      result = case when rk <= e.winners and r.percent >= e.pass_percent then 'merit' when r.percent >= e.pass_percent then 'pass' else 'fail' end,
      cert_no = coalesce(cert_no, case when (rk <= e.winners and e.cert_merit) or e.cert_participation then upper(left(e.slug, 3)) || '/' || to_char(now(), 'YYYY') || '/' || lpad((cert_count + 1)::text, 4, '0') end),
      cert_issued_at = coalesce(cert_issued_at, case when (rk <= e.winners and e.cert_merit) or e.cert_participation then now() end)
      where id = r.id;
    if (rk <= e.winners and e.cert_merit) or e.cert_participation then cert_count := cert_count + 1; end if;
    n := n + 1;
  end loop;
  update public.ex_exams set status = 'results', results_at = now() where id = p_exam;
  -- tell every candidate
  for r in select x.user_id, x.student_name, x.rank, x.result, x.percent, x.public_token from public.ex_registrations x where x.exam_id = p_exam and x.percent is not null loop
    perform public.k1_notify_user(e.organization_id, r.user_id, '🏆 ' || coalesce(e.title_hi, e.title) || ' — परिणाम',
      r.student_name || ': ' || r.percent || '% · स्थान ' || r.rank || ' · ' || case r.result when 'merit' then 'मेरिट 🎉' when 'pass' then 'उत्तीर्ण' else 'अनुत्तीर्ण' end || E'\n' || 'प्रमाण-पत्र और विवरण नीचे लिंक पर।',
      '/exams/' || e.slug || '/result/' || r.public_token, 'ex_exams', e.id);
  end loop;
  return n;
end $$;
grant execute on function public.ex_compute_results(uuid) to authenticated;

-- public result / certificate by token (no login needed; shows only what a certificate shows)
create or replace function public.ex_result_public(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('student_name', r.student_name, 'student_name_hi', r.student_name_hi, 'school', r.school, 'city', r.city, 'class_level', r.class_level, 'reg_no', r.reg_no,
                            'score', r.score, 'max_score', r.max_score, 'percent', r.percent, 'rank', r.rank, 'result', r.result, 'cert_no', r.cert_no, 'cert_issued_at', r.cert_issued_at,
                            'exam', jsonb_build_object('title', e.title, 'title_hi', e.title_hi, 'slug', e.slug, 'starts_at', e.starts_at, 'results_at', e.results_at),
                            'category', jsonb_build_object('name', c.name, 'name_hi', c.name_hi),
                            'org_name', coalesce(o.name_hi, o.name), 'org_logo', (select s.logo from public.organization_settings s where s.organization_id = e.organization_id))
    from public.ex_registrations r join public.ex_exams e on e.id = r.exam_id left join public.ex_categories c on c.id = r.category_id join core.organizations o on o.id = e.organization_id
   where r.public_token = p_token and e.status = 'results';
$$;
grant execute on function public.ex_result_public(text) to anon, authenticated;

-- leaderboard (results published): merit list per category, first names + school only
create or replace function public.ex_leaderboard(p_exam uuid)
returns table (category_id uuid, category_name text, rank int, student_name text, school text, city text, percent numeric, result text)
language sql stable security definer set search_path = '' as $$
  select r.category_id, coalesce(c.name_hi, c.name), r.rank, r.student_name, r.school, r.city, r.percent, r.result
    from public.ex_registrations r join public.ex_exams e on e.id = r.exam_id left join public.ex_categories c on c.id = r.category_id
   where r.exam_id = p_exam and e.status = 'results' and r.rank is not null and r.rank <= greatest(e.winners, 10)
   order by c.display_order, r.rank;
$$;
grant execute on function public.ex_leaderboard(uuid) to anon, authenticated;

-- my registrations (student / parent)
create or replace function public.ex_my_registrations()
returns table (id uuid, reg_no text, exam_id uuid, exam_slug text, exam_title text, exam_title_hi text, exam_status text, starts_at timestamptz, ends_at timestamptz, duration_minutes int, category_name text, student_name text, status text, attempted boolean, score numeric, max_score numeric, percent numeric, rank int, result text, cert_no text, public_token text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.reg_no, e.id, e.slug, e.title, e.title_hi, e.status, e.starts_at, e.ends_at, e.duration_minutes, coalesce(c.name_hi, c.name), r.student_name, r.status,
         exists (select 1 from public.ex_attempts a where a.registration_id = r.id and not a.practice and a.submitted_at is not null),
         r.score, r.max_score, r.percent, r.rank, r.result, r.cert_no, r.public_token
    from public.ex_registrations r join public.ex_exams e on e.id = r.exam_id left join public.ex_categories c on c.id = r.category_id
   where r.user_id = auth.uid() order by e.starts_at desc nulls last, r.created_at desc;
$$;
grant execute on function public.ex_my_registrations() to authenticated;

-- bulk question import (managers): rows [{subject, topic, class_from, class_to, difficulty, lang, question, question_hi, options[], correct[], explanation}]
create or replace function public.ex_questions_import(p_org uuid, p_rows jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare x jsonb; n int := 0;
begin
  if not public.ex_can_manage(p_org) then raise exception 'Not allowed'; end if;
  for x in select * from jsonb_array_elements(p_rows) loop
    if coalesce(x->>'question', '') = '' or jsonb_array_length(coalesce(x->'options', '[]'::jsonb)) < 2 then continue; end if;
    insert into public.ex_questions(organization_id, subject, topic, class_from, class_to, difficulty, lang, qtype, question, question_hi, image, options, correct, explanation, created_by)
    values (p_org, coalesce(x->>'subject', 'सामान्य'), x->>'topic', (x->>'class_from')::int, (x->>'class_to')::int, coalesce(x->>'difficulty', 'medium'), coalesce(x->>'lang', 'hi'), coalesce(x->>'qtype', 'mcq'), x->>'question', x->>'question_hi', x->>'image', x->'options', coalesce(x->'correct', '[0]'::jsonb), x->>'explanation', auth.uid());
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.ex_questions_import(uuid, jsonb) to authenticated;

-- attach questions to an exam's paper pool by filter (managers)
create or replace function public.ex_paper_fill(p_exam uuid, p_category uuid, p_subject text default null, p_class_from int default null, p_class_to int default null, p_difficulty text default null, p_lang text default null, p_limit int default 100, p_marks numeric default 1)
returns int language plpgsql security definer set search_path = '' as $$
declare e public.ex_exams; n int;
begin
  select * into e from public.ex_exams where id = p_exam;
  if e is null or not public.ex_can_manage(e.organization_id) then raise exception 'Not allowed'; end if;
  insert into public.ex_paper_questions(exam_id, category_id, question_id, marks)
  select p_exam, p_category, q.id, p_marks from public.ex_questions q
   where q.status = 'active' and (q.organization_id = e.organization_id or q.organization_id = coalesce(public.k1_root_org(e.organization_id), e.organization_id))
     and (p_subject is null or q.subject = p_subject) and (p_lang is null or q.lang = p_lang) and (p_difficulty is null or q.difficulty = p_difficulty)
     and (p_class_from is null or coalesce(q.class_to, 99) >= p_class_from) and (p_class_to is null or coalesce(q.class_from, 0) <= p_class_to)
   order by random() limit least(p_limit, 500)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.ex_paper_fill(uuid, uuid, text, int, int, text, text, int, numeric) to authenticated;

-- public list of exams (platform-wide: the root's + the organization's own)
create or replace function public.ex_list(p_org uuid)
returns table (id uuid, organization_id uuid, org_name text, slug text, title text, title_hi text, summary text, summary_hi text, cover_image text, kind text, status text, reg_opens_at timestamptz, reg_closes_at timestamptz, starts_at timestamptz, ends_at timestamptz, duration_minutes int, registrations bigint)
language sql stable security definer set search_path = '' as $$
  select e.id, e.organization_id, coalesce(o.name_hi, o.name), e.slug, e.title, e.title_hi, e.summary, e.summary_hi, e.cover_image, e.kind, e.status, e.reg_opens_at, e.reg_closes_at, e.starts_at, e.ends_at, e.duration_minutes,
         (select count(*) from public.ex_registrations r where r.exam_id = e.id and r.status = 'registered')
    from public.ex_exams e join core.organizations o on o.id = e.organization_id
   where e.status <> 'draft' and (e.organization_id = p_org or e.organization_id = coalesce(public.k1_root_org(p_org), p_org))
   order by case e.status when 'running' then 0 when 'open' then 1 when 'results' then 2 else 3 end, e.starts_at desc nulls last;
$$;
grant execute on function public.ex_list(uuid) to anon, authenticated;
