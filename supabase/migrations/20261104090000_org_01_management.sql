-- Kalchuri One · Phase 3 · Organization management: memberships, committees & positions, meetings,
-- agenda, minutes, resolutions, tasks, announcements, documents, milestones, number series.
-- Tables live in `public` with org_/gov_ prefixes (the Data API exposes only `public`; no dashboard step needed).

-- ---------- number series (shared by members now, letters/receipts later) ----------
create table public.org_number_series (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  kind text not null,                        -- member, letter, receipt, voucher, certificate…
  prefix text not null default '',
  next_no int not null default 1,
  pad int not null default 4,
  unique (organization_id, kind)
);
alter table public.org_number_series enable row level security;
create policy series_read on public.org_number_series for select to authenticated using (core.is_org_team(organization_id));
create policy series_write on public.org_number_series for all to authenticated
  using (core.can(organization_id, 'org.settings.edit')) with check (core.can(organization_id, 'org.settings.edit'));
grant select, insert, update on public.org_number_series to authenticated;
grant all on public.org_number_series to service_role;

-- gap-free: locks the series row inside the caller's transaction
create or replace function public.k1_next_number(p_org uuid, p_kind text)
returns text language plpgsql security definer set search_path = '' as $$
declare s record; short text;
begin
  select coalesce(short_name, upper(left(slug, 6))) into short from core.organizations where id = p_org;
  insert into public.org_number_series(organization_id, kind, prefix)
  values (p_org, p_kind, upper(regexp_replace(short, '[^A-Za-z0-9]', '', 'g')) || '/' || upper(left(p_kind, 1)) || '/')
  on conflict (organization_id, kind) do nothing;
  select * into s from public.org_number_series where organization_id = p_org and kind = p_kind for update;
  update public.org_number_series set next_no = s.next_no + 1 where id = s.id;
  return s.prefix || lpad(s.next_no::text, s.pad, '0');
end $$;
revoke all on function public.k1_next_number(uuid, text) from public, anon, authenticated;

-- ---------- memberships ----------
create table public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  member_no text,
  full_name text not null check (length(trim(full_name)) > 1),
  full_name_hi text,
  father_name text,
  gender text check (gender in ('male','female','other')),
  dob date,
  mobile text not null check (mobile ~ '^[0-9]{10,13}$'),
  whatsapp text,
  email text,
  address text, village text, city text, district text, state text, pincode text,
  occupation text,
  education text,
  blood_group text,
  photo_path text,
  category text not null default 'general' check (category in ('general','life','patron','executive','honorary')),
  status text not null default 'applied' check (status in ('applied','active','lapsed','rejected','expelled')),
  consent boolean not null default false,
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  admin_note text,
  valid_from date,
  valid_to date,
  card_issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, member_no)
);
create unique index org_memberships_org_user on public.org_memberships(organization_id, user_id) where user_id is not null;
create unique index org_memberships_org_mobile_active on public.org_memberships(organization_id, mobile) where status in ('applied','active');
create index on public.org_memberships(organization_id, status);
create trigger trg_org_memberships_updated before update on public.org_memberships for each row execute function public.set_updated_at();
create trigger audit_org_memberships after insert or update or delete on public.org_memberships for each row execute function core.audit_row();
alter table public.org_memberships enable row level security;
-- anyone can apply (status forced to 'applied' by trigger); applicants read their own; team with permission reads/edits all
create policy memberships_apply on public.org_memberships for insert with check (status = 'applied');
create policy memberships_read on public.org_memberships for select to authenticated
  using (user_id = auth.uid() or core.can(organization_id, 'org.member.approve') or core.can(organization_id, 'org.member.card.issue'));
create policy memberships_update on public.org_memberships for update to authenticated
  using (core.can(organization_id, 'org.member.approve')) with check (core.can(organization_id, 'org.member.approve'));
create policy memberships_delete on public.org_memberships for delete to authenticated using (core.can(organization_id, 'org.settings.edit'));
grant insert on public.org_memberships to anon;
grant select, insert, update, delete on public.org_memberships to authenticated;
grant all on public.org_memberships to service_role;

create or replace function public.org_memberships_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not core.can(new.organization_id, 'org.member.approve') then
      new.status := 'applied'; new.member_no := null; new.decided_at := null; new.decided_by := null;
      if auth.uid() is not null then new.user_id := auth.uid(); end if;
    end if;
    new.mobile := regexp_replace(new.mobile, '[^0-9]', '', 'g');
    if length(new.mobile) = 10 then new.mobile := '91' || new.mobile; end if;
  end if;
  return new;
end $$;
create trigger trg_org_memberships_guard before insert on public.org_memberships for each row execute function public.org_memberships_guard();

-- decide: first decision wins; approval assigns the member number
create or replace function public.k1_decide_membership(p_id uuid, p_approve boolean, p_category text default null, p_note text default null)
returns public.org_memberships language plpgsql security definer set search_path = '' as $$
declare m public.org_memberships;
begin
  select * into m from public.org_memberships where id = p_id for update;
  if m is null then raise exception 'Application not found'; end if;
  if not core.can(m.organization_id, 'org.member.approve') then raise exception 'Not allowed'; end if;
  if m.status <> 'applied' then raise exception 'Already decided (%)', m.status; end if;
  update public.org_memberships
     set status = case when p_approve then 'active' else 'rejected' end,
         category = coalesce(p_category, category),
         member_no = case when p_approve then public.k1_next_number(m.organization_id, 'member') else null end,
         valid_from = case when p_approve then current_date else null end,
         decided_at = now(), decided_by = auth.uid(), admin_note = p_note
   where id = p_id returning * into m;
  return m;
end $$;
grant execute on function public.k1_decide_membership(uuid, boolean, text, text) to authenticated;

-- link an applicant's own account by mobile (called after login)
create or replace function public.k1_claim_memberships()
returns int language plpgsql security definer set search_path = '' as $$
declare ph text; n int;
begin
  select coalesce(nullif(regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g'), ''), p.phone) into ph
    from auth.users u left join public.profiles p on p.id = u.id where u.id = auth.uid();
  if ph is null then return 0; end if;
  update public.org_memberships set user_id = auth.uid()
   where user_id is null and mobile = ph
     and not exists (select 1 from public.org_memberships x where x.organization_id = org_memberships.organization_id and x.user_id = auth.uid());
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.k1_claim_memberships() to authenticated;

-- ---------- committees & positions ----------
create table public.gov_committees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  name text not null, name_hi text,
  kind text not null default 'executive' check (kind in ('executive','advisory','working','women','youth','trustee','other')),
  description text,
  tenure_from date, tenure_to date,
  status text not null default 'active' check (status in ('active','dissolved')),
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.gov_committees(organization_id);
create trigger trg_gov_committees_updated before update on public.gov_committees for each row execute function public.set_updated_at();

create table public.gov_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  committee_id uuid not null references public.gov_committees(id) on delete cascade,
  membership_id uuid references public.org_memberships(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  person_name text not null,
  person_name_hi text,
  designation text not null,          -- President, Secretary, Treasurer, Member…
  designation_hi text,
  rank int not null default 100,      -- display order (1 = top)
  phone text, email text, photo_path text, city text,
  appointed_by text not null default 'nomination' check (appointed_by in ('election','nomination','ex_officio','co_option')),
  from_date date, to_date date,
  show_public boolean not null default true,
  show_phone_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.gov_positions(organization_id, committee_id);
create trigger trg_gov_positions_updated before update on public.gov_positions for each row execute function public.set_updated_at();

create table public.gov_departments_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  department_id uuid not null references core.departments(id) on delete cascade,
  membership_id uuid references public.org_memberships(id) on delete cascade,
  person_name text not null,
  role_title text,
  created_at timestamptz not null default now()
);

-- ---------- meetings ----------
create table public.gov_meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  committee_id uuid references public.gov_committees(id) on delete set null,
  title text not null, title_hi text,
  kind text not null default 'committee' check (kind in ('committee','general_body','annual_general','special','working','online')),
  scheduled_at timestamptz not null,
  ends_at timestamptz,
  venue text, online_link text,
  notice_text text,
  status text not null default 'planned' check (status in ('planned','notice_sent','held','cancelled','postponed')),
  minutes text,                         -- markdown/plain minutes (document studio later)
  minutes_status text not null default 'draft' check (minutes_status in ('draft','submitted','approved')),
  minutes_approved_by uuid references auth.users(id) on delete set null,
  minutes_approved_at timestamptz,
  attendance jsonb not null default '[]'::jsonb,   -- [{name, membership_id?, present}]
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.gov_meetings(organization_id, scheduled_at desc);
create trigger trg_gov_meetings_updated before update on public.gov_meetings for each row execute function public.set_updated_at();

create table public.gov_agenda_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  meeting_id uuid not null references public.gov_meetings(id) on delete cascade,
  item_no int not null default 1,
  title text not null,
  detail text,
  presenter text,
  outcome text,
  created_at timestamptz not null default now()
);
create index on public.gov_agenda_items(meeting_id, item_no);

create table public.gov_resolutions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  meeting_id uuid references public.gov_meetings(id) on delete set null,
  number text,
  title text not null,
  text text not null,
  proposer text, seconder text,
  result text not null default 'passed' check (result in ('passed','rejected','deferred','unanimous')),
  votes_for int, votes_against int, votes_abstain int,
  resolved_on date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.gov_resolutions(organization_id, resolved_on desc);
create trigger trg_gov_resolutions_updated before update on public.gov_resolutions for each row execute function public.set_updated_at();
create or replace function public.gov_resolutions_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.number is null or new.number = '' then new.number := public.k1_next_number(new.organization_id, 'resolution'); end if;
  return new;
end $$;
create trigger trg_gov_resolutions_number before insert on public.gov_resolutions for each row execute function public.gov_resolutions_number();

create table public.gov_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  title text not null,
  detail text,
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_name text,
  due_date date,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  meeting_id uuid references public.gov_meetings(id) on delete set null,
  resolution_id uuid references public.gov_resolutions(id) on delete set null,
  department_id uuid references core.departments(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.gov_tasks(organization_id, status, due_date);
create trigger trg_gov_tasks_updated before update on public.gov_tasks for each row execute function public.set_updated_at();

create table public.gov_announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  title text not null, title_hi text,
  body text not null, body_hi text,
  audience text not null default 'members' check (audience in ('public','members','team')),
  pinned boolean not null default false,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.gov_announcements(organization_id, publish_at desc);
create trigger trg_gov_announcements_updated before update on public.gov_announcements for each row execute function public.set_updated_at();

create table public.org_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  title text not null, title_hi text,
  kind text not null default 'other' check (kind in ('registration','bylaws','policy','annual_report','activity_report','audit_report','minutes','certificate','other')),
  year int,
  file_path text,            -- storage bucket org-files
  external_url text,
  visibility text not null default 'team' check (visibility in ('public','members','team')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.org_documents(organization_id, kind);
create trigger trg_org_documents_updated before update on public.org_documents for each row execute function public.set_updated_at();

create table public.org_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  happened_on date not null,
  title text not null, title_hi text,
  body text, body_hi text,
  image text,
  kind text not null default 'milestone' check (kind in ('founding','milestone','achievement','award','event')),
  show_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.org_milestones(organization_id, happened_on);
create trigger trg_org_milestones_updated before update on public.org_milestones for each row execute function public.set_updated_at();

-- ---------- RLS for gov_* / org_documents / org_milestones ----------
do $$
declare t text; perm text;
begin
  foreach t in array array['gov_committees','gov_positions','gov_departments_members','gov_meetings','gov_agenda_items','gov_resolutions','gov_tasks','gov_announcements','org_documents','org_milestones'] loop
    perm := case when t in ('gov_resolutions') then 'gov.resolution.record'
                 when t in ('gov_meetings','gov_agenda_items','gov_tasks') then 'gov.meeting.manage'
                 else 'org.settings.edit' end;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (core.can(organization_id, %L)) with check (core.can(organization_id, %L))', t||'_write', t, perm, perm);
    execute format('create policy %I on public.%I for select to authenticated using (core.is_org_team(organization_id))', t||'_team_read', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
-- audit the governance records
create trigger audit_gov_positions after insert or update or delete on public.gov_positions for each row execute function core.audit_row();
create trigger audit_gov_resolutions after insert or update or delete on public.gov_resolutions for each row execute function core.audit_row();
create trigger audit_gov_meetings after update or delete on public.gov_meetings for each row execute function core.audit_row();

-- public read of what the organization chooses to show
create policy committees_public on public.gov_committees for select using (status = 'active');
create policy positions_public on public.gov_positions for select using (show_public = true);
create policy announcements_public on public.gov_announcements for select using (audience = 'public' and publish_at <= now() and (expires_at is null or expires_at > now()));
create policy documents_public on public.org_documents for select using (visibility = 'public');
create policy milestones_public on public.org_milestones for select using (show_public = true);
grant select on public.gov_committees, public.gov_positions, public.gov_announcements, public.org_documents, public.org_milestones to anon;
-- members (active membership) read member-only announcements/documents
create policy announcements_members on public.gov_announcements for select to authenticated
  using (audience = 'members' and exists (select 1 from public.org_memberships m where m.organization_id = gov_announcements.organization_id and m.user_id = auth.uid() and m.status = 'active'));
create policy documents_members on public.org_documents for select to authenticated
  using (visibility = 'members' and exists (select 1 from public.org_memberships m where m.organization_id = org_documents.organization_id and m.user_id = auth.uid() and m.status = 'active'));
-- assignees can see and update their own tasks
create policy tasks_assignee on public.gov_tasks for select to authenticated using (assignee_user_id = auth.uid());
create policy tasks_assignee_update on public.gov_tasks for update to authenticated using (assignee_user_id = auth.uid()) with check (assignee_user_id = auth.uid());

-- public view of positions hides phone unless allowed
create or replace view public.gov_positions_public with (security_invoker = true) as
  select p.id, p.organization_id, p.committee_id, p.person_name, p.person_name_hi, p.designation, p.designation_hi, p.rank,
         case when p.show_phone_public then p.phone end as phone, p.photo_path, p.city, p.from_date, p.to_date
    from public.gov_positions p where p.show_public;
grant select on public.gov_positions_public to anon, authenticated;

-- ---------- storage for organization files ----------
insert into storage.buckets (id, name, public) values ('org-files','org-files',false) on conflict (id) do nothing;
create policy "org files team read" on storage.objects for select to authenticated
  using (bucket_id = 'org-files' and core.is_org_team(((storage.foldername(name))[1])::uuid));
create policy "org files admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'org-files' and core.can(((storage.foldername(name))[1])::uuid, 'org.settings.edit'));
create policy "org files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'org-files' and core.can(((storage.foldername(name))[1])::uuid, 'org.settings.edit'));

-- ---------- member count / stats for dashboards ----------
create or replace function public.k1_org_stats(p_org uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'members_active', (select count(*) from public.org_memberships where organization_id = p_org and status = 'active'),
    'members_applied', (select count(*) from public.org_memberships where organization_id = p_org and status = 'applied'),
    'committees', (select count(*) from public.gov_committees where organization_id = p_org and status = 'active'),
    'meetings_upcoming', (select count(*) from public.gov_meetings where organization_id = p_org and status in ('planned','notice_sent') and scheduled_at >= now()),
    'tasks_open', (select count(*) from public.gov_tasks where organization_id = p_org and status in ('open','in_progress')),
    'resolutions', (select count(*) from public.gov_resolutions where organization_id = p_org))
  where core.is_org_team(p_org);
$$;
grant execute on function public.k1_org_stats(uuid) to authenticated;
