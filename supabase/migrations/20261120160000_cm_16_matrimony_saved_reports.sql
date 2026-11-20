-- वैवाहिक: (1) पसंद की सूची (बाद के लिए रखे परिचय), (2) गलत / पुराने परिचय की शिकायत

create table if not exists public.cm_matrimony_saved (
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.cm_matrimony_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);
alter table public.cm_matrimony_saved enable row level security;
drop policy if exists cm_matri_saved_own on public.cm_matrimony_saved;
create policy cm_matri_saved_own on public.cm_matrimony_saved for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.cm_matrimony_saved from anon;
grant select, insert, delete on public.cm_matrimony_saved to authenticated;

create table if not exists public.cm_matrimony_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.cm_matrimony_profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_by uuid, closed_at timestamptz,
  unique (profile_id, user_id)
);
alter table public.cm_matrimony_reports enable row level security;
revoke all on public.cm_matrimony_reports from anon, authenticated;

create or replace function public.k1_matrimony_report(p_profile uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.cm_matrimony_profiles; rid uuid; r text := btrim(coalesce(p_reason, ''));
begin
  if not public.k1_is_any_member() then raise exception 'Members only'; end if;
  select * into p from public.cm_matrimony_profiles where id = p_profile;
  if p.id is null then raise exception 'Profile not available'; end if;
  if char_length(r) < 3 then raise exception 'कारण लिखिए'; end if;
  if (select count(*) from public.cm_matrimony_reports where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'आज के लिए बहुत शिकायतें हो गईं — कल फिर कोशिश कीजिए';
  end if;
  insert into public.cm_matrimony_reports (profile_id, user_id, reason) values (p_profile, auth.uid(), left(r, 500))
  on conflict (profile_id, user_id) do update set reason = excluded.reason, status = 'open', created_at = now(), closed_by = null, closed_at = null
  returning id into rid;
  begin
    perform public.k1_notify_org_admins(p.organization_id, 'community.matrimony.manage',
      'वैवाहिक परिचय "' || p.display_name || '" पर शिकायत आई है: ' || left(r, 200) || E'\nAdmin → Community → Matrimony में देखिए।', 'cm_matrimony_reports', rid);
  exception when others then null;
  end;
end $$;
revoke all on function public.k1_matrimony_report(uuid, text) from public, anon;
grant execute on function public.k1_matrimony_report(uuid, text) to authenticated;

create or replace function public.k1_matrimony_reports(p_org uuid)
returns table (id uuid, profile_id uuid, display_name text, reason text, reporter text, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, p.id, p.display_name, r.reason,
         coalesce((select om.full_name from public.org_memberships om where om.user_id = r.user_id limit 1), (select pr.full_name from public.profiles pr where pr.id = r.user_id), 'सदस्य'),
         r.status, r.created_at
    from public.cm_matrimony_reports r join public.cm_matrimony_profiles p on p.id = r.profile_id
   where p.organization_id = p_org and core.can(p_org, 'community.matrimony.manage')
   order by (r.status = 'open') desc, r.created_at desc;
$$;
revoke all on function public.k1_matrimony_reports(uuid) from public, anon;
grant execute on function public.k1_matrimony_reports(uuid) to authenticated;

create or replace function public.k1_matrimony_report_close(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  select p.organization_id into org from public.cm_matrimony_reports r join public.cm_matrimony_profiles p on p.id = r.profile_id where r.id = p_id;
  if org is null or not core.can(org, 'community.matrimony.manage') then raise exception 'Not allowed'; end if;
  update public.cm_matrimony_reports set status = 'closed', closed_by = auth.uid(), closed_at = now() where id = p_id;
end $$;
revoke all on function public.k1_matrimony_report_close(uuid) from public, anon;
grant execute on function public.k1_matrimony_report_close(uuid) to authenticated;
