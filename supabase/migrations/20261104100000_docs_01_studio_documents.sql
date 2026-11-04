-- Kalchuri One · Phase 4 · Design Studio templates + document workflow (letters, certificates, receipts, cards).

create table public.docs_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references core.organizations(id) on delete cascade,   -- null = shared platform template
  kind text not null check (kind in ('letterhead','letter','notice','certificate','invitation','receipt','voucher','id_card','poster','shok_patra','magazine_cover','other')),
  name text not null, name_hi text,
  design jsonb not null,                 -- DesignDoc (src/design-engine/model.ts)
  thumbnail text,                        -- data URL / storage path
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.docs_templates(organization_id, kind);
create trigger trg_docs_templates_updated before update on public.docs_templates for each row execute function public.set_updated_at();
alter table public.docs_templates enable row level security;
create policy templates_read on public.docs_templates for select to authenticated
  using (organization_id is null or core.is_org_team(organization_id));
create policy templates_write on public.docs_templates for all to authenticated
  using ((organization_id is null and core.is_platform_admin()) or (organization_id is not null and core.can(organization_id, 'docs.template.edit')))
  with check ((organization_id is null and core.is_platform_admin()) or (organization_id is not null and core.can(organization_id, 'docs.template.edit')));
grant select, insert, update, delete on public.docs_templates to authenticated;
grant all on public.docs_templates to service_role;

create table public.docs_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  kind text not null check (kind in ('letter','notice','certificate','invitation','receipt','voucher','id_card','appointment','office_order','press_release','resolution','other')),
  template_id uuid references public.docs_templates(id) on delete set null,
  title text not null,                   -- internal title / certificate type / receipt title
  ref_no text,
  doc_date date not null default current_date,
  subject text,
  recipient jsonb not null default '{}'::jsonb,   -- {name, designation, organization, address, phone, email}
  body text,                             -- plain text with **bold**; flows across pages
  fields jsonb not null default '{}'::jsonb,      -- extra merge data (doc.*, receipt.*, member.* …)
  signatories jsonb not null default '[]'::jsonb, -- [{name, designation}]
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','issued','cancelled')),
  submitted_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  issued_at timestamptz,
  issued_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  cancel_reason text,
  verify_code text unique,
  pdf_path text,
  source_table text, source_id uuid,     -- e.g. donations / org_memberships / gov_meetings
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, kind, ref_no)
);
create index on public.docs_documents(organization_id, kind, status);
create index on public.docs_documents(organization_id, doc_date desc);
create trigger trg_docs_documents_updated before update on public.docs_documents for each row execute function public.set_updated_at();
create trigger audit_docs_documents after insert or update or delete on public.docs_documents for each row execute function core.audit_row();
alter table public.docs_documents enable row level security;
create policy documents_read on public.docs_documents for select to authenticated
  using (core.is_org_team(organization_id));
create policy documents_insert on public.docs_documents for insert to authenticated
  with check (core.can(organization_id, 'docs.letter.create') and status = 'draft');
create policy documents_update on public.docs_documents for update to authenticated
  using (core.can(organization_id, 'docs.letter.create') and status = 'draft' and (created_by = auth.uid() or core.can(organization_id, 'docs.letter.approve')))
  with check (status = 'draft');
create policy documents_delete on public.docs_documents for delete to authenticated
  using (status = 'draft' and (created_by = auth.uid() or core.can(organization_id, 'docs.letter.approve')));
grant select, insert, update, delete on public.docs_documents to authenticated;
grant all on public.docs_documents to service_role;

create or replace function public.docs_documents_defaults()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.created_by := coalesce(new.created_by, auth.uid()); end if;
  return new;
end $$;
create trigger trg_docs_documents_defaults before insert on public.docs_documents for each row execute function public.docs_documents_defaults();

-- workflow RPCs (status changes only here; RLS forbids direct status edits)
create or replace function public.k1_submit_document(p_id uuid)
returns public.docs_documents language plpgsql security definer set search_path = '' as $$
declare d public.docs_documents;
begin
  select * into d from public.docs_documents where id = p_id for update;
  if d is null then raise exception 'Document not found'; end if;
  if not core.can(d.organization_id, 'docs.letter.create') then raise exception 'Not allowed'; end if;
  if d.status <> 'draft' then raise exception 'Only drafts can be submitted'; end if;
  update public.docs_documents set status = 'pending_approval', submitted_at = now() where id = p_id returning * into d;
  return d;
end $$;

create or replace function public.k1_decide_document(p_id uuid, p_approve boolean, p_note text default null)
returns public.docs_documents language plpgsql security definer set search_path = '' as $$
declare d public.docs_documents;
begin
  select * into d from public.docs_documents where id = p_id for update;
  if d is null then raise exception 'Document not found'; end if;
  if not core.can(d.organization_id, 'docs.letter.approve') then raise exception 'Not allowed'; end if;
  if d.status <> 'pending_approval' then raise exception 'Not awaiting approval (%)', d.status; end if;
  if p_approve then
    update public.docs_documents set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = p_id returning * into d;
  else
    update public.docs_documents set status = 'draft', fields = fields || jsonb_build_object('_review_note', coalesce(p_note, '')) where id = p_id returning * into d;
  end if;
  return d;
end $$;

-- issue: assigns the reference number (series per kind) and verify code; from 'approved', or directly from 'draft'
-- when the organization does not require approval for this kind (approver issuing own document).
create or replace function public.k1_issue_document(p_id uuid)
returns public.docs_documents language plpgsql security definer set search_path = '' as $$
declare d public.docs_documents; code text;
begin
  select * into d from public.docs_documents where id = p_id for update;
  if d is null then raise exception 'Document not found'; end if;
  if not core.can(d.organization_id, 'docs.letter.approve') then raise exception 'Only an approver can issue documents'; end if;
  if d.status not in ('approved','draft','pending_approval') then raise exception 'Cannot issue a % document', d.status; end if;
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  update public.docs_documents
     set status = 'issued',
         ref_no = coalesce(nullif(ref_no, ''), public.k1_next_number(organization_id, kind)),
         verify_code = coalesce(verify_code, code),
         approved_by = coalesce(approved_by, auth.uid()), approved_at = coalesce(approved_at, now()),
         issued_at = now(), issued_by = auth.uid()
   where id = p_id returning * into d;
  return d;
end $$;

create or replace function public.k1_cancel_document(p_id uuid, p_reason text)
returns public.docs_documents language plpgsql security definer set search_path = '' as $$
declare d public.docs_documents;
begin
  select * into d from public.docs_documents where id = p_id for update;
  if d is null then raise exception 'Document not found'; end if;
  if not core.can(d.organization_id, 'docs.letter.approve') then raise exception 'Not allowed'; end if;
  if d.status <> 'issued' then raise exception 'Only issued documents are cancelled (drafts are deleted)'; end if;
  update public.docs_documents set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason where id = p_id returning * into d;
  return d;
end $$;

-- store the rendered PDF path (client renders, uploads to bucket documents/<org>/<doc>.pdf)
create or replace function public.k1_set_document_pdf(p_id uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.docs_documents;
begin
  select * into d from public.docs_documents where id = p_id;
  if d is null or not core.is_org_team(d.organization_id) then raise exception 'Not allowed'; end if;
  if p_path not like d.organization_id::text || '/%' then raise exception 'Path must be inside the organization folder'; end if;
  update public.docs_documents set pdf_path = p_path where id = p_id;
end $$;

-- public verification: minimal, no personal details beyond what the document itself shows
create or replace function public.k1_verify_document(p_code text)
returns table (kind text, ref_no text, doc_date date, title text, status text, organization text, recipient_name text, issued_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.kind, d.ref_no, d.doc_date, d.title, d.status, o.name, d.recipient->>'name', d.issued_at
    from public.docs_documents d join core.organizations o on o.id = d.organization_id
   where d.verify_code = upper(trim(p_code)) and d.status in ('issued','cancelled');
$$;

revoke all on function public.k1_submit_document(uuid), public.k1_decide_document(uuid, boolean, text), public.k1_issue_document(uuid),
  public.k1_cancel_document(uuid, text), public.k1_set_document_pdf(uuid, text), public.k1_verify_document(text) from public;
grant execute on function public.k1_submit_document(uuid), public.k1_decide_document(uuid, boolean, text), public.k1_issue_document(uuid),
  public.k1_cancel_document(uuid, text), public.k1_set_document_pdf(uuid, text) to authenticated;
grant execute on function public.k1_verify_document(text) to anon, authenticated;

-- dispatch log + inward/outward register
create table public.docs_dispatches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  document_id uuid not null references public.docs_documents(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','email','hand','post','courier','other')),
  to_name text, to_contact text,
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('queued','sent','delivered','failed')),
  note text, message_id uuid,
  created_by uuid references auth.users(id) on delete set null
);
create index on public.docs_dispatches(document_id);

create table public.docs_register (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  direction text not null check (direction in ('inward','outward')),
  entry_no text,
  entry_date date not null default current_date,
  ref_no text,
  from_to text not null,
  subject text not null,
  document_id uuid references public.docs_documents(id) on delete set null,
  file_path text, external_url text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.docs_register(organization_id, direction, entry_date desc);
create or replace function public.docs_register_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.entry_no is null or new.entry_no = '' then new.entry_no := public.k1_next_number(new.organization_id, case when new.direction = 'inward' then 'inward' else 'outward' end); end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;
create trigger trg_docs_register_number before insert on public.docs_register for each row execute function public.docs_register_number();

do $$
declare t text;
begin
  foreach t in array array['docs_dispatches','docs_register'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (core.is_org_team(organization_id))', t||'_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (core.can(organization_id, %L)) with check (core.can(organization_id, %L))', t||'_write', t, 'docs.letter.dispatch', 'docs.letter.dispatch');
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- documents bucket: team of the org can read its folder; issuers upload PDFs
create policy "docs pdf team read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and core.is_org_team(((storage.foldername(name))[1])::uuid));
create policy "docs pdf upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and core.can(((storage.foldername(name))[1])::uuid, 'docs.letter.create'));
create policy "docs pdf replace" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and core.can(((storage.foldername(name))[1])::uuid, 'docs.letter.create'));
