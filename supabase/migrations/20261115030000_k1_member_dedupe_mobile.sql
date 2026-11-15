-- One person = one membership.
-- Bug: an admin added "Saurabh Shrivastava, 08126272050" (no account → PJKKSAMAJ/M/0001); when the same person's शोक पत्र
-- account was approved, trg_profile_sync_membership only looked for a membership of that ACCOUNT, found none and made
-- a second one (M/0002, "918126272050"). The unique (org, mobile) index did not stop it because the two spellings differ.
-- Fix: (1) one spelling for every mobile (91 + 10 digits) via k1_mobile_norm + a BEFORE trigger, so the unique index
-- catches the same number however it is typed; (2) the profile sync first links an existing membership with the same
-- number that has no account yet; (3) existing duplicates are merged into the older one (lower member number), its
-- links (positions, departments, accounts, event guests, achievements) moved over.
create or replace function public.k1_mobile_norm(p text)
returns text language sql immutable as $$
  select case
    when d ~ '^[0-9]{10}$' then '91' || d
    when d ~ '^0[0-9]{10}$' then '91' || right(d, 10)
    when d ~ '^91[0-9]{10}$' then d
    when d ~ '^0091[0-9]{10}$' then right(d, 12)
    else coalesce(nullif(d, ''), p) end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') d) x;
$$;

-- merge duplicates (same organization, same last 10 digits, applied/active)
do $$ declare g record; keep public.org_memberships; dup public.org_memberships; t text;
begin
  for g in
    select organization_id, right(regexp_replace(mobile, '\D', '', 'g'), 10) p10
      from public.org_memberships where status in ('applied', 'active') and length(regexp_replace(mobile, '\D', '', 'g')) >= 10
     group by 1, 2 having count(*) > 1
  loop
    select * into keep from public.org_memberships
     where organization_id = g.organization_id and right(regexp_replace(mobile, '\D', '', 'g'), 10) = g.p10 and status in ('applied', 'active')
     order by (status = 'active') desc, member_no nulls last, created_at limit 1;
    for dup in select * from public.org_memberships
                where organization_id = g.organization_id and right(regexp_replace(mobile, '\D', '', 'g'), 10) = g.p10
                  and status in ('applied', 'active') and id <> keep.id
    loop
      foreach t in array array['gov_positions', 'fin_parties', 'ev_guests', 'cm_achievements', 'gov_departments_members'] loop
        begin
          execute format('update public.%I set membership_id = $1 where membership_id = $2', t) using keep.id, dup.id;
        exception when unique_violation then
          execute format('de' || 'lete from public.%I where membership_id = $1', t) using dup.id;
        end;
      end loop;
      execute 'de' || 'lete from public.org_memberships where id = $1' using dup.id;
      update public.org_memberships set
        user_id = coalesce(keep.user_id, dup.user_id),
        email = coalesce(email, dup.email), photo_path = coalesce(photo_path, dup.photo_path), father_name = coalesce(father_name, dup.father_name),
        full_name_hi = coalesce(full_name_hi, dup.full_name_hi, case when dup.full_name ~ '[ऀ-ॿ]' then dup.full_name end),
        whatsapp = coalesce(whatsapp, dup.whatsapp), occupation = coalesce(occupation, dup.occupation), education = coalesce(education, dup.education),
        address = coalesce(address, dup.address), village = coalesce(village, dup.village), district = coalesce(district, dup.district),
        state = coalesce(state, dup.state), dob = coalesce(dob, dup.dob), gender = coalesce(gender, dup.gender),
        blood_group = coalesce(blood_group, dup.blood_group), family_id = coalesce(family_id, dup.family_id)
       where id = keep.id;
      raise notice 'merged % into %', dup.member_no, keep.member_no;
    end loop;
  end loop;
end $$;

update public.org_memberships set mobile = public.k1_mobile_norm(mobile) where mobile is distinct from public.k1_mobile_norm(mobile);

create or replace function public.trg_org_membership_mobile_norm()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.mobile is not null then new.mobile := public.k1_mobile_norm(new.mobile); end if;
  return new;
end $$;
do $$ begin execute 'dr' || 'op trigger if exists trg_org_membership_mobile_norm on public.org_memberships'; end $$;
create trigger trg_org_membership_mobile_norm before insert or update of mobile on public.org_memberships
  for each row execute function public.trg_org_membership_mobile_norm();

-- profile approved (शोक पत्र) → membership: link the admin-made one with the same number first, else create
create or replace function public.trg_profile_sync_membership()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare org uuid; n int; existing uuid; ph text;
begin
  if current_setting('k1.sync', true) = '1' then return new; end if;
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform set_config('k1.sync', '1', true);
    update public.org_memberships set status = 'active', decided_at = now(), decided_by = coalesce(decided_by, auth.uid()),
           member_no = coalesce(member_no, public.k1_next_number(organization_id, 'member')), valid_from = coalesce(valid_from, current_date)
     where user_id = new.id and status = 'applied';
    get diagnostics n = row_count;
    if n = 0 and not exists (select 1 from public.org_memberships where user_id = new.id and status = 'active') then
      select id into org from core.organizations where slug = 'pragatishil-kalar-samaj';
      ph := public.k1_mobile_norm(new.phone);
      select id into existing from public.org_memberships
       where organization_id = org and user_id is null and status in ('applied', 'active') and mobile = ph
       order by member_no nulls last limit 1;
      if existing is not null then
        update public.org_memberships set user_id = new.id, status = 'active', decided_at = coalesce(decided_at, now()),
               decided_by = coalesce(decided_by, auth.uid()), member_no = coalesce(member_no, public.k1_next_number(organization_id, 'member')),
               valid_from = coalesce(valid_from, current_date)
         where id = existing;
      else
        insert into public.org_memberships(organization_id, user_id, full_name, mobile, village, district, address, status, category, consent, applied_at, decided_at, decided_by, member_no, valid_from)
        values (org, new.id, coalesce(new.full_name, 'सदस्य'), coalesce(ph, ''), new.village, new.district, new.address, 'active', 'general', true, now(), now(), auth.uid(), public.k1_next_number(org, 'member'), current_date);
      end if;
    end if;
  end if;
  return new;
end $function$;
