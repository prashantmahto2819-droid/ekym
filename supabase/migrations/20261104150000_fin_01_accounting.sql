-- Kalchuri One · Phase 7 · double-entry accounting (fin_* tables in public).
-- Chart of accounts per organization (seeded from a society template), financial years with lock,
-- vouchers (receipt / payment / journal / contra) with lines, posting rules, cancel + reversal,
-- report RPCs (ledger, trial balance, income & expenditure, receipts & payments, cash/bank book),
-- and automatic receipt vouchers for paid Razorpay donations.

-- ---------- chart of accounts ----------
create table public.fin_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  name_hi text,
  type text not null check (type in ('asset','liability','income','expense','equity')),
  parent_id uuid references public.fin_accounts(id) on delete set null,
  is_group boolean not null default false,
  is_cash boolean not null default false,
  is_bank boolean not null default false,
  bank_details jsonb,                                  -- {bank, account_no, ifsc, branch}
  opening_balance numeric(14,2) not null default 0,    -- debit positive / credit negative, at the start of the first FY
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index on public.fin_accounts(organization_id, type);
create trigger trg_fin_accounts_updated before update on public.fin_accounts for each row execute function public.set_updated_at();
create trigger audit_fin_accounts after insert or update or delete on public.fin_accounts for each row execute function core.audit_row();

-- ---------- financial years ----------
create table public.fin_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  label text not null,                                 -- 2026-27
  starts_on date not null,
  ends_on date not null,
  locked boolean not null default false,
  locked_at timestamptz, locked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, label),
  check (ends_on > starts_on)
);
create index on public.fin_years(organization_id, starts_on);
create trigger audit_fin_years after insert or update or delete on public.fin_years for each row execute function core.audit_row();

-- ---------- parties (donors, members, vendors) ----------
create table public.fin_parties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  kind text not null default 'donor' check (kind in ('donor','member','vendor','sponsor','other')),
  name text not null,
  phone text, email text, pan text, gstin text, address text,
  membership_id uuid references public.org_memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.fin_parties(organization_id, name);
create trigger trg_fin_parties_updated before update on public.fin_parties for each row execute function public.set_updated_at();

-- ---------- vouchers ----------
create table public.fin_vouchers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  fy_id uuid references public.fin_years(id) on delete restrict,
  type text not null check (type in ('receipt','payment','journal','contra')),
  number text,                                         -- assigned on post (series per type)
  voucher_date date not null default current_date,
  party_id uuid references public.fin_parties(id) on delete set null,
  party_name text,                                     -- snapshot
  mode text check (mode in ('cash','upi','bank','cheque','online','other')),
  instrument jsonb not null default '{}'::jsonb,       -- {no, date, bank, txn}
  narration text,
  amount numeric(14,2) not null default 0,             -- total debit (= total credit) when posted
  status text not null default 'draft' check (status in ('draft','posted','cancelled')),
  source text not null default 'manual' check (source in ('manual','donation','membership','event','ad','reversal')),
  source_id uuid,                                      -- donations.id / org_memberships.id …
  reversal_of uuid references public.fin_vouchers(id) on delete set null,
  reversed_by uuid references public.fin_vouchers(id) on delete set null,
  cancel_reason text,
  document_id uuid references public.docs_documents(id) on delete set null,   -- printed receipt (design engine)
  created_by uuid references auth.users(id) on delete set null,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index on public.fin_vouchers(organization_id, voucher_date desc);
create index on public.fin_vouchers(organization_id, status);
create unique index fin_vouchers_source_uq on public.fin_vouchers(organization_id, source, source_id) where source_id is not null and status <> 'cancelled';
create trigger trg_fin_vouchers_updated before update on public.fin_vouchers for each row execute function public.set_updated_at();
create trigger audit_fin_vouchers after insert or update or delete on public.fin_vouchers for each row execute function core.audit_row();

create table public.fin_lines (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.fin_vouchers(id) on delete cascade,
  organization_id uuid not null references core.organizations(id) on delete cascade,
  account_id uuid not null references public.fin_accounts(id) on delete restrict,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  note text,
  sort_order int not null default 0,
  check (not (debit > 0 and credit > 0))
);
create index on public.fin_lines(voucher_id);
create index on public.fin_lines(organization_id, account_id);

-- ---------- RLS ----------
alter table public.fin_accounts enable row level security;
alter table public.fin_years enable row level security;
alter table public.fin_parties enable row level security;
alter table public.fin_vouchers enable row level security;
alter table public.fin_lines enable row level security;

create policy fin_accounts_read on public.fin_accounts for select to authenticated using (core.can(organization_id, 'fin.report.view') or core.can(organization_id, 'fin.voucher.create'));
create policy fin_accounts_write on public.fin_accounts for all to authenticated using (core.can(organization_id, 'fin.voucher.create')) with check (core.can(organization_id, 'fin.voucher.create'));
create policy fin_years_read on public.fin_years for select to authenticated using (core.can(organization_id, 'fin.report.view') or core.can(organization_id, 'fin.voucher.create'));
create policy fin_years_write on public.fin_years for insert to authenticated with check (core.can(organization_id, 'fin.voucher.create'));
create policy fin_parties_rw on public.fin_parties for all to authenticated using (core.can(organization_id, 'fin.voucher.create') or core.can(organization_id, 'fin.report.view')) with check (core.can(organization_id, 'fin.voucher.create'));
create policy fin_vouchers_read on public.fin_vouchers for select to authenticated using (core.can(organization_id, 'fin.report.view') or core.can(organization_id, 'fin.voucher.create'));
create policy fin_vouchers_insert on public.fin_vouchers for insert to authenticated with check (core.can(organization_id, 'fin.voucher.create') and status = 'draft');
create policy fin_vouchers_update_draft on public.fin_vouchers for update to authenticated using (core.can(organization_id, 'fin.voucher.create') and status = 'draft') with check (status = 'draft');
create policy fin_vouchers_delete_draft on public.fin_vouchers for delete to authenticated using (core.can(organization_id, 'fin.voucher.create') and status = 'draft');
create policy fin_lines_read on public.fin_lines for select to authenticated using (core.can(organization_id, 'fin.report.view') or core.can(organization_id, 'fin.voucher.create'));
create policy fin_lines_write on public.fin_lines for all to authenticated
  using (core.can(organization_id, 'fin.voucher.create') and exists (select 1 from public.fin_vouchers v where v.id = voucher_id and v.status = 'draft'))
  with check (core.can(organization_id, 'fin.voucher.create') and exists (select 1 from public.fin_vouchers v where v.id = voucher_id and v.status = 'draft'));
grant select, insert, update, delete on public.fin_accounts, public.fin_years, public.fin_parties, public.fin_vouchers, public.fin_lines to authenticated;

-- locked FY: nothing changes (vouchers + lines), even for admins
create or replace function public.fin_guard_locked()
returns trigger language plpgsql security definer set search_path = '' as $$
declare fyid uuid; lbl text; lk boolean;
begin
  if tg_table_name = 'fin_lines' then
    select v.fy_id into fyid from public.fin_vouchers v where v.id = case when tg_op = 'DELETE' then old.voucher_id else new.voucher_id end;
  else
    fyid := case when tg_op = 'DELETE' then old.fy_id else coalesce(old.fy_id, new.fy_id) end;
  end if;
  if fyid is not null then
    select locked, label into lk, lbl from public.fin_years where id = fyid;
    if lk and current_setting('fin.unlock', true) is distinct from 'on' then raise exception 'Financial year % is locked', lbl; end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger trg_fin_vouchers_locked before insert or update or delete on public.fin_vouchers for each row execute function public.fin_guard_locked();
create trigger trg_fin_lines_locked before insert or update or delete on public.fin_lines for each row execute function public.fin_guard_locked();

-- ---------- helpers ----------
create or replace function public.fin_year_for(p_org uuid, p_date date)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.fin_years where organization_id = p_org and p_date between starts_on and ends_on limit 1;
$$;

-- Indian FY (April–March) label for a date
create or replace function public.fin_fy_label(p_date date)
returns text language sql immutable as $$
  select case when extract(month from p_date) >= 4
    then extract(year from p_date)::int::text || '-' || lpad(((extract(year from p_date)::int + 1) % 100)::text, 2, '0')
    else (extract(year from p_date)::int - 1)::text || '-' || lpad((extract(year from p_date)::int % 100)::text, 2, '0') end;
$$;

-- ensure a FY row exists for the date (creates April–March year)
create or replace function public.fin_ensure_year(p_org uuid, p_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare fid uuid; y int;
begin
  fid := public.fin_year_for(p_org, p_date);
  if fid is not null then return fid; end if;
  y := case when extract(month from p_date) >= 4 then extract(year from p_date)::int else extract(year from p_date)::int - 1 end;
  insert into public.fin_years(organization_id, label, starts_on, ends_on)
  values (p_org, public.fin_fy_label(p_date), make_date(y, 4, 1), make_date(y + 1, 3, 31))
  on conflict (organization_id, label) do nothing;
  return public.fin_year_for(p_org, p_date);
end $$;

-- voucher number series: <SHORT>/R|P|J|C/0001 (distinct per type)
create or replace function public.fin_ensure_series(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare short text;
begin
  select upper(regexp_replace(coalesce(short_name, upper(left(slug, 6))), '[^A-Za-z0-9]', '', 'g')) into short from core.organizations where id = p_org;
  insert into public.org_number_series(organization_id, kind, prefix) values
    (p_org, 'voucher_receipt', short || '/R/'), (p_org, 'voucher_payment', short || '/P/'), (p_org, 'voucher_journal', short || '/J/'), (p_org, 'voucher_contra', short || '/C/')
  on conflict (organization_id, kind) do nothing;
end $$;

-- standard society chart of accounts (idempotent per org)
create or replace function public.fin_seed_accounts(p_org uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare n int := 0; r record;
begin
  if not core.can(p_org, 'fin.voucher.create') then raise exception 'Not allowed'; end if;
  perform public.fin_ensure_series(p_org);
  for r in select * from (values
    ('1000','Assets','संपत्ति','asset',null,true,false,false,10),
    ('1100','Cash in hand','नकद','asset','1000',false,true,false,11),
    ('1200','Bank account','बैंक खाता','asset','1000',false,false,true,12),
    ('1300','Receivables / advances','प्राप्य / अग्रिम','asset','1000',false,false,false,13),
    ('1400','Fixed assets','स्थायी संपत्ति','asset','1000',false,false,false,14),
    ('2000','Liabilities','देनदारियाँ','liability',null,true,false,false,20),
    ('2100','Payables','देय','liability','2000',false,false,false,21),
    ('2200','Advance receipts','अग्रिम प्राप्ति','liability','2000',false,false,false,22),
    ('3000','General fund','सामान्य निधि','equity',null,true,false,false,30),
    ('3100','Opening balance / corpus','प्रारंभिक शेष / कोष','equity','3000',false,false,false,31),
    ('4000','Income','आय','income',null,true,false,false,40),
    ('4100','Donations','दान','income','4000',false,false,false,41),
    ('4200','Membership fees','सदस्यता शुल्क','income','4000',false,false,false,42),
    ('4300','Event income','आयोजन आय','income','4000',false,false,false,43),
    ('4400','Sponsorship / advertisement','प्रायोजन / विज्ञापन','income','4000',false,false,false,44),
    ('4500','Interest','ब्याज','income','4000',false,false,false,45),
    ('4900','Other income','अन्य आय','income','4000',false,false,false,49),
    ('5000','Expenses','व्यय','expense',null,true,false,false,50),
    ('5100','Event expenses','आयोजन व्यय','expense','5000',false,false,false,51),
    ('5200','Seva / welfare','सेवा / कल्याण','expense','5000',false,false,false,52),
    ('5300','Printing & stationery','छपाई व लेखन सामग्री','expense','5000',false,false,false,53),
    ('5400','Office & rent','कार्यालय व किराया','expense','5000',false,false,false,54),
    ('5500','Travel','यात्रा','expense','5000',false,false,false,55),
    ('5600','Bank charges & fees','बैंक शुल्क','expense','5000',false,false,false,56),
    ('5700','Website & communication','वेबसाइट व संचार','expense','5000',false,false,false,57),
    ('5900','Other expenses','अन्य व्यय','expense','5000',false,false,false,59)
  ) as t(code, name, name_hi, type, parent_code, is_group, is_cash, is_bank, sort_order) loop
    insert into public.fin_accounts(organization_id, code, name, name_hi, type, parent_id, is_group, is_cash, is_bank, sort_order)
    values (p_org, r.code, r.name, r.name_hi, r.type, (select id from public.fin_accounts a where a.organization_id = p_org and a.code = r.parent_code), r.is_group, r.is_cash, r.is_bank, r.sort_order)
    on conflict (organization_id, code) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;
grant execute on function public.fin_seed_accounts(uuid) to authenticated;

-- ---------- posting ----------
create or replace function public.fin_post_voucher(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.fin_vouchers; d numeric; c numeric; nlines int; fy uuid; num text; kind text;
begin
  select * into v from public.fin_vouchers where id = p_id for update;
  if v is null then raise exception 'Voucher not found'; end if;
  if not core.can(v.organization_id, 'fin.voucher.create') then raise exception 'Not allowed'; end if;
  if v.status <> 'draft' then raise exception 'Only draft vouchers can be posted'; end if;
  select coalesce(sum(debit),0), coalesce(sum(credit),0), count(*) into d, c, nlines from public.fin_lines where voucher_id = p_id;
  if nlines < 2 then raise exception 'A voucher needs at least two lines'; end if;
  if d <> c or d = 0 then raise exception 'Debit (%) and credit (%) must be equal and non-zero', d, c; end if;
  if exists (select 1 from public.fin_lines l join public.fin_accounts a on a.id = l.account_id where l.voucher_id = p_id and (a.is_group or not a.is_active)) then
    raise exception 'Group or inactive accounts cannot be posted to';
  end if;
  fy := public.fin_ensure_year(v.organization_id, v.voucher_date);
  if (select locked from public.fin_years where id = fy) then raise exception 'Financial year is locked'; end if;
  perform public.fin_ensure_series(v.organization_id);
  kind := 'voucher_' || v.type;
  num := public.k1_next_number(v.organization_id, kind);
  update public.fin_vouchers set status = 'posted', number = num, fy_id = fy, amount = d, posted_by = auth.uid(), posted_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'number', num, 'amount', d);
end $$;
grant execute on function public.fin_post_voucher(uuid) to authenticated;

-- cancel: draft → deleted; posted → cancelled (lines stay, excluded from reports) with reason. Needs fin.voucher.cancel.
create or replace function public.fin_cancel_voucher(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.fin_vouchers;
begin
  select * into v from public.fin_vouchers where id = p_id for update;
  if v is null then raise exception 'Voucher not found'; end if;
  if v.status = 'draft' then
    if not core.can(v.organization_id, 'fin.voucher.create') then raise exception 'Not allowed'; end if;
    delete from public.fin_vouchers where id = p_id; return;
  end if;
  if not core.can(v.organization_id, 'fin.voucher.cancel') then raise exception 'Not allowed'; end if;
  if v.status <> 'posted' then raise exception 'Already cancelled'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Reason required'; end if;
  if (select locked from public.fin_years where id = v.fy_id) then raise exception 'Financial year is locked — use a reversal in the open year'; end if;
  update public.fin_vouchers set status = 'cancelled', cancel_reason = p_reason where id = p_id;
end $$;
grant execute on function public.fin_cancel_voucher(uuid, text) to authenticated;

-- reversal: new posted journal with debits/credits swapped, dated p_date (for corrections in a later/open period)
create or replace function public.fin_reverse_voucher(p_id uuid, p_date date default current_date, p_reason text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.fin_vouchers; nid uuid;
begin
  select * into v from public.fin_vouchers where id = p_id;
  if v is null or v.status <> 'posted' then raise exception 'Only posted vouchers can be reversed'; end if;
  if not core.can(v.organization_id, 'fin.voucher.cancel') then raise exception 'Not allowed'; end if;
  if v.reversed_by is not null then raise exception 'Already reversed'; end if;
  insert into public.fin_vouchers(organization_id, type, voucher_date, party_id, party_name, mode, narration, source, reversal_of, created_by)
  values (v.organization_id, 'journal', p_date, v.party_id, v.party_name, v.mode, coalesce(p_reason, 'Reversal of ' || coalesce(v.number, '')), 'reversal', v.id, auth.uid())
  returning id into nid;
  insert into public.fin_lines(voucher_id, organization_id, account_id, debit, credit, note, sort_order)
  select nid, organization_id, account_id, credit, debit, note, sort_order from public.fin_lines where voucher_id = p_id;
  perform public.fin_post_voucher(nid);
  perform set_config('fin.unlock', 'on', true);   -- the original may sit in a locked year; only this flag changes
  update public.fin_vouchers set reversed_by = nid where id = p_id;
  perform set_config('fin.unlock', 'off', true);
  return nid;
end $$;
grant execute on function public.fin_reverse_voucher(uuid, date, text) to authenticated;

-- lock / unlock a financial year (fin.fy.lock)
create or replace function public.fin_lock_year(p_id uuid, p_lock boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare y public.fin_years;
begin
  select * into y from public.fin_years where id = p_id;
  if y is null or not core.can(y.organization_id, 'fin.fy.lock') then raise exception 'Not allowed'; end if;
  if p_lock and exists (select 1 from public.fin_vouchers where fy_id = p_id and status = 'draft') then raise exception 'Post or delete draft vouchers first'; end if;
  update public.fin_years set locked = p_lock, locked_at = case when p_lock then now() end, locked_by = case when p_lock then auth.uid() end where id = p_id;
end $$;
grant execute on function public.fin_lock_year(uuid, boolean) to authenticated;

-- ---------- reports ----------
-- account balances between dates (posted only). Opening = opening_balance + movements before p_from.
create or replace function public.fin_trial_balance(p_org uuid, p_from date, p_to date)
returns table (account_id uuid, code text, name text, name_hi text, type text, parent_id uuid, is_group boolean, opening numeric, debit numeric, credit numeric, closing numeric)
language sql stable security definer set search_path = '' as $$
  with mv as (
    select l.account_id,
           sum(case when v.voucher_date < p_from then l.debit - l.credit else 0 end) as before,
           sum(case when v.voucher_date between p_from and p_to then l.debit else 0 end) as dr,
           sum(case when v.voucher_date between p_from and p_to then l.credit else 0 end) as cr
      from public.fin_lines l join public.fin_vouchers v on v.id = l.voucher_id
     where v.organization_id = p_org and v.status = 'posted'
     group by l.account_id)
  select a.id, a.code, a.name, a.name_hi, a.type, a.parent_id, a.is_group,
         a.opening_balance + coalesce(mv.before,0), coalesce(mv.dr,0), coalesce(mv.cr,0),
         a.opening_balance + coalesce(mv.before,0) + coalesce(mv.dr,0) - coalesce(mv.cr,0)
    from public.fin_accounts a left join mv on mv.account_id = a.id
   where a.organization_id = p_org and (core.can(p_org, 'fin.report.view') or core.can(p_org, 'fin.voucher.create'))
   order by a.code;
$$;
grant execute on function public.fin_trial_balance(uuid, date, date) to authenticated;

-- ledger of one account (running balance)
create or replace function public.fin_ledger(p_account uuid, p_from date, p_to date)
returns table (voucher_id uuid, voucher_date date, number text, type text, party_name text, narration text, debit numeric, credit numeric, balance numeric)
language sql stable security definer set search_path = '' as $$
  with a as (select * from public.fin_accounts where id = p_account),
  opening as (
    select (select opening_balance from a) + coalesce(sum(l.debit - l.credit),0) as bal
      from public.fin_lines l join public.fin_vouchers v on v.id = l.voucher_id
     where l.account_id = p_account and v.status = 'posted' and v.voucher_date < p_from),
  rows_ as (
    select v.id, v.voucher_date, v.number, v.type, v.party_name, coalesce(l.note, v.narration) as narration, l.debit, l.credit, v.posted_at
      from public.fin_lines l join public.fin_vouchers v on v.id = l.voucher_id
     where l.account_id = p_account and v.status = 'posted' and v.voucher_date between p_from and p_to)
  select null::uuid, p_from, 'Opening', 'opening', null, 'Opening balance', case when bal > 0 then bal else 0 end, case when bal < 0 then -bal else 0 end, bal from opening
   where exists (select 1 from a where core.can(a.organization_id, 'fin.report.view') or core.can(a.organization_id, 'fin.voucher.create'))
  union all
  select id, voucher_date, number, type, party_name, narration, debit, credit,
         (select bal from opening) + sum(debit - credit) over (order by voucher_date, posted_at, id rows unbounded preceding)
    from rows_
   where exists (select 1 from a where core.can(a.organization_id, 'fin.report.view') or core.can(a.organization_id, 'fin.voucher.create'))
   order by 2, 9;
$$;
grant execute on function public.fin_ledger(uuid, date, date) to authenticated;

-- cash/bank book: all cash+bank accounts' entries
create or replace function public.fin_cashbook(p_org uuid, p_from date, p_to date, p_account uuid default null)
returns table (voucher_id uuid, voucher_date date, number text, type text, account_name text, party_name text, narration text, receipt numeric, payment numeric)
language sql stable security definer set search_path = '' as $$
  select v.id, v.voucher_date, v.number, v.type, a.name, v.party_name, coalesce(l.note, v.narration), l.debit, l.credit
    from public.fin_lines l join public.fin_vouchers v on v.id = l.voucher_id join public.fin_accounts a on a.id = l.account_id
   where v.organization_id = p_org and v.status = 'posted' and (a.is_cash or a.is_bank) and (p_account is null or a.id = p_account)
     and v.voucher_date between p_from and p_to
     and (core.can(p_org, 'fin.report.view') or core.can(p_org, 'fin.voucher.create'))
   order by v.voucher_date, v.posted_at;
$$;
grant execute on function public.fin_cashbook(uuid, date, date, uuid) to authenticated;

-- receipts & payments (cash basis): movements through cash/bank accounts grouped by the other side
create or replace function public.fin_receipts_payments(p_org uuid, p_from date, p_to date)
returns table (side text, account_id uuid, code text, name text, name_hi text, amount numeric)
language sql stable security definer set search_path = '' as $$
  with cashv as (
    select distinct l.voucher_id from public.fin_lines l join public.fin_accounts a on a.id = l.account_id where a.is_cash or a.is_bank),
  other as (
    select l.account_id, l.debit, l.credit
      from public.fin_lines l join public.fin_vouchers v on v.id = l.voucher_id join public.fin_accounts a on a.id = l.account_id
     where v.organization_id = p_org and v.status = 'posted' and v.voucher_date between p_from and p_to
       and l.voucher_id in (select voucher_id from cashv) and not (a.is_cash or a.is_bank))
  select case when sum(o.credit - o.debit) >= 0 then 'receipt' else 'payment' end, a.id, a.code, a.name, a.name_hi, abs(sum(o.credit - o.debit))
    from other o join public.fin_accounts a on a.id = o.account_id
   where core.can(p_org, 'fin.report.view') or core.can(p_org, 'fin.voucher.create')
   group by a.id, a.code, a.name, a.name_hi
  having sum(o.credit - o.debit) <> 0
   order by 1, 3;
$$;
grant execute on function public.fin_receipts_payments(uuid, date, date) to authenticated;

-- ---------- Razorpay donation → receipt voucher ----------
create or replace function public.fin_post_donation(p_donation uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare d record; org uuid; vid uuid; bank uuid; inc uuid; pid uuid;
begin
  select * into d from public.donations where id = p_donation;
  if d is null or d.status::text <> 'PAID' or d.organization_id is null then return null; end if;
  org := d.organization_id;
  if exists (select 1 from public.fin_vouchers where organization_id = org and source = 'donation' and source_id = p_donation and status <> 'cancelled') then return null; end if;
  if not exists (select 1 from public.fin_accounts where organization_id = org) then return null; end if;  -- accounting not set up yet
  select id into bank from public.fin_accounts where organization_id = org and is_bank and is_active order by sort_order limit 1;
  select id into inc from public.fin_accounts where organization_id = org and code = '4100';
  if bank is null or inc is null then return null; end if;
  perform public.fin_ensure_series(org);
  insert into public.fin_parties(organization_id, kind, name, phone, email, pan, address)
  values (org, 'donor', d.donor_name, d.donor_mobile, d.donor_email, d.pan, concat_ws(', ', d.address, d.city, d.district, d.state, d.pincode))
  returning id into pid;
  insert into public.fin_vouchers(organization_id, type, voucher_date, party_id, party_name, mode, instrument, narration, source, source_id, created_by)
  values (org, 'receipt', coalesce(d.paid_at::date, current_date), pid, d.donor_name, 'online',
          jsonb_build_object('txn', d.razorpay_payment_id, 'order', d.razorpay_order_id, 'method', d.payment_method),
          concat_ws(' · ', 'Online donation', d.donation_id, d.purpose), 'donation', p_donation, d.donor_user_id)
  returning id into vid;
  insert into public.fin_lines(voucher_id, organization_id, account_id, debit, credit, sort_order) values
    (vid, org, bank, d.amount, 0, 0), (vid, org, inc, 0, d.amount, 1);
  -- post with system rights (no auth.uid in webhooks): mimic fin_post_voucher without the permission check
  update public.fin_vouchers set status = 'posted', number = public.k1_next_number(org, 'voucher_receipt'), fy_id = public.fin_ensure_year(org, coalesce(d.paid_at::date, current_date)), amount = d.amount, posted_at = now() where id = vid;
  return vid;
end $$;
revoke all on function public.fin_post_donation(uuid) from public, anon, authenticated;

create or replace function public.trg_fin_donation_paid()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status::text = 'PAID' and (old.status::text is distinct from 'PAID') then perform public.fin_post_donation(new.id); end if;
  return new;
end $$;
create trigger trg_fin_donation_paid after update of status on public.donations for each row execute function public.trg_fin_donation_paid();

-- catch-up for already paid donations of an organization (treasurer action)
create or replace function public.fin_import_paid_donations(p_org uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare n int := 0; r record;
begin
  if not core.can(p_org, 'fin.voucher.create') then raise exception 'Not allowed'; end if;
  for r in select id from public.donations where organization_id = p_org and status::text = 'PAID' order by paid_at loop
    if public.fin_post_donation(r.id) is not null then n := n + 1; end if;
  end loop;
  return n;
end $$;
grant execute on function public.fin_import_paid_donations(uuid) to authenticated;

-- voucher with lines for printing / editing (one call)
create or replace function public.fin_voucher_detail(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(v) || jsonb_build_object(
    'lines', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'account_id', l.account_id, 'code', a.code, 'account', a.name, 'account_hi', a.name_hi, 'debit', l.debit, 'credit', l.credit, 'note', l.note) order by l.sort_order), '[]'::jsonb)
                from public.fin_lines l join public.fin_accounts a on a.id = l.account_id where l.voucher_id = v.id),
    'party', (select to_jsonb(p) from public.fin_parties p where p.id = v.party_id),
    'fy', (select label from public.fin_years y where y.id = v.fy_id))
    from public.fin_vouchers v
   where v.id = p_id and (core.can(v.organization_id, 'fin.report.view') or core.can(v.organization_id, 'fin.voucher.create'));
$$;
grant execute on function public.fin_voucher_detail(uuid) to authenticated;
