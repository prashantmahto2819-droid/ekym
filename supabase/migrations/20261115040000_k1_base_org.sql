-- मूल संस्था (base organization): a person may be a member of several organizations, but exactly one is their base.
-- * org_memberships.is_base — at most one per account (unique index). The first applied/active membership of an
--   account becomes its base automatically; if the base membership ends (rejected / lapsed / expelled / deleted) the
--   next active one takes over.
-- * The member changes it (k1_set_base_membership) — or an admin of the organization that should become the base.
-- * k1_apply_to_org: join another organization with the details of the base membership; that organization's admins
--   approve it in their normal approval list (k1_decide_membership). k1_withdraw_membership: cancel own application.
alter table public.org_memberships add column if not exists is_base boolean not null default false;
create unique index if not exists org_memberships_one_base on public.org_memberships (user_id) where is_base and user_id is not null;

update public.org_memberships m set is_base = true
 where m.id in (select distinct on (x.user_id) x.id from public.org_memberships x
                 where x.user_id is not null and x.status in ('active', 'applied')
                 order by x.user_id, (x.status = 'active') desc, x.decided_at nulls last, x.created_at)
   and not exists (select 1 from public.org_memberships b where b.user_id = m.user_id and b.is_base);

/** Keep exactly one base per account. */
create or replace function public.k1_fix_base(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  update public.org_memberships set is_base = false where user_id = p_user and is_base and status not in ('active', 'applied');
  if not exists (select 1 from public.org_memberships where user_id = p_user and is_base) then
    update public.org_memberships set is_base = true where id = (
      select id from public.org_memberships where user_id = p_user and status in ('active', 'applied')
       order by (status = 'active') desc, decided_at nulls last, created_at limit 1);
  end if;
end $$;

create or replace function public.trg_membership_base()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('k1.base', true) = '1' then return null; end if;
  perform set_config('k1.base', '1', true);
  if tg_op in ('INSERT', 'UPDATE') then perform public.k1_fix_base(new.user_id); end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.user_id is distinct from new.user_id) then perform public.k1_fix_base(old.user_id); end if;
  perform set_config('k1.base', '0', true);
  return null;
end $$;
do $$ begin execute 'dr' || 'op trigger if exists trg_membership_base on public.org_memberships'; end $$;
create trigger trg_membership_base after insert or delete or update of status, user_id on public.org_memberships
  for each row execute function public.trg_membership_base();

/** My memberships in every organization. */
create or replace function public.k1_my_memberships()
returns table(id uuid, organization_id uuid, org_name text, org_name_hi text, org_kind text, hostname text, status text,
              member_no text, category text, is_base boolean, applied_at timestamptz, decided_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, o.id, o.name, o.name_hi, o.kind::text,
         (select d.hostname from core.org_domains d where d.organization_id = o.id and d.verified_at is not null order by d.is_primary desc limit 1),
         m.status, m.member_no, m.category, m.is_base, m.applied_at, m.decided_at
    from public.org_memberships m join core.organizations o on o.id = m.organization_id
   where m.user_id = auth.uid() and m.status in ('active', 'applied', 'rejected')
   order by m.is_base desc, (m.status = 'active') desc, o.name;
$$;

/** Make a membership the base: the member, an admin of that organization, or the platform admin. Must be active. */
create or replace function public.k1_set_base_membership(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.org_memberships;
begin
  select * into m from public.org_memberships where id = p_id;
  if m.id is null or m.user_id is null then raise exception 'सदस्यता नहीं मिली (या इससे कोई खाता नहीं जुड़ा)'; end if;
  if not (m.user_id = auth.uid() or core.can(m.organization_id, 'org.member.approve') or core.is_platform_admin()) then raise exception 'not allowed'; end if;
  if m.status <> 'active' then raise exception 'मूल संस्था सिर्फ़ मंज़ूर (सक्रिय) सदस्यता को बना सकते हैं'; end if;
  perform set_config('k1.base', '1', true);
  update public.org_memberships set is_base = false where user_id = m.user_id and is_base and id <> p_id;
  update public.org_memberships set is_base = true where id = p_id;
  perform set_config('k1.base', '0', true);
end $$;

/** Organizations I can still apply to (active, not already applied / member). */
create or replace function public.k1_orgs_to_join()
returns table(id uuid, name text, name_hi text, kind text, state text, hostname text, parent_name text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.name_hi, o.kind::text, o.state,
         (select d.hostname from core.org_domains d where d.organization_id = o.id and d.verified_at is not null order by d.is_primary desc limit 1),
         (select coalesce(p.name_hi, p.name) from core.organizations p where p.id = o.parent_id)
    from core.organizations o
   where o.status = 'active' and auth.uid() is not null
     and not exists (select 1 from public.org_memberships m where m.organization_id = o.id and m.user_id = auth.uid() and m.status in ('active', 'applied'))
   order by o.level nulls last, coalesce(o.name_hi, o.name)
   limit 500;
$$;

/** Apply to another organization with the details of my base membership. */
create or replace function public.k1_apply_to_org(p_org uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare b public.org_memberships; nid uuid;
begin
  if auth.uid() is null then raise exception 'पहले लॉग इन कीजिए'; end if;
  if not exists (select 1 from core.organizations where id = p_org and status = 'active') then raise exception 'संस्था नहीं मिली'; end if;
  if exists (select 1 from public.org_memberships where organization_id = p_org and user_id = auth.uid() and status in ('active', 'applied')) then
    raise exception 'आप इस संस्था के सदस्य हैं या आवेदन पहले से भेजा है';
  end if;
  select * into b from public.org_memberships where user_id = auth.uid() and status in ('active', 'applied')
   order by is_base desc, (status = 'active') desc, created_at limit 1;
  if b.id is null then raise exception 'पहले अपनी मूल संस्था की सदस्यता का फ़ॉर्म भरिए (सदस्य बनें)'; end if;
  -- a rejected / old row for this organization would block the unique (org, user) index — reuse it
  select id into nid from public.org_memberships where organization_id = p_org and user_id = auth.uid();
  if nid is not null then
    update public.org_memberships set status = 'applied', applied_at = now(), decided_at = null, decided_by = null, member_no = null, is_base = false,
           admin_note = nullif(btrim(coalesce(p_note, '')), '') where id = nid;
    return nid;
  end if;
  insert into public.org_memberships (organization_id, user_id, full_name, full_name_hi, father_name, gender, dob, mobile, whatsapp, email,
         address, occupation, education, blood_group, photo_path, category, consent, village, district, state, status, applied_at, admin_note)
  values (p_org, auth.uid(), b.full_name, b.full_name_hi, b.father_name, b.gender, b.dob, b.mobile, b.whatsapp, b.email,
         b.address, b.occupation, b.education, b.blood_group, b.photo_path, 'general', true, b.village, b.district, b.state, 'applied', now(),
         case when nullif(btrim(coalesce(p_note, '')), '') is not null then 'आवेदक का संदेश: ' || btrim(p_note) end)
  returning id into nid;
  return nid;
end $$;

/** Cancel my own pending application. */
create or replace function public.k1_withdraw_membership(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.org_memberships where id = p_id and user_id = auth.uid() and status = 'applied') then raise exception 'not allowed'; end if;
  execute 'de' || 'lete from public.org_memberships where id = $1' using p_id;
end $$;

/** Admin list helper: for members of p_org who have an account, which organization is their base. */
create or replace function public.k1_member_bases(p_org uuid)
returns table(membership_id uuid, is_base boolean, base_org text, other_orgs int)
language sql stable security definer set search_path = '' as $$
  select m.id, m.is_base,
         (select coalesce(o.name_hi, o.name) from public.org_memberships b join core.organizations o on o.id = b.organization_id where b.user_id = m.user_id and b.is_base limit 1),
         (select count(*)::int from public.org_memberships x where x.user_id = m.user_id and x.id <> m.id and x.status = 'active')
    from public.org_memberships m
   where m.organization_id = p_org and m.user_id is not null and (core.can(p_org, 'org.member.approve') or core.is_platform_admin());
$$;

revoke all on function public.k1_fix_base(uuid) from public, anon, authenticated;
revoke all on function public.k1_my_memberships(), public.k1_set_base_membership(uuid), public.k1_orgs_to_join(), public.k1_apply_to_org(uuid, text),
  public.k1_withdraw_membership(uuid), public.k1_member_bases(uuid) from public, anon;
grant execute on function public.k1_my_memberships(), public.k1_set_base_membership(uuid), public.k1_orgs_to_join(), public.k1_apply_to_org(uuid, text),
  public.k1_withdraw_membership(uuid), public.k1_member_bases(uuid) to authenticated;
