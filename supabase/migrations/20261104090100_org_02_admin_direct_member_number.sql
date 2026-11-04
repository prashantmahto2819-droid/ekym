-- A member added directly by an admin as 'active' gets a member number and decision stamp.
create or replace function public.org_memberships_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not core.can(new.organization_id, 'org.member.approve') then
      new.status := 'applied'; new.member_no := null; new.decided_at := null; new.decided_by := null;
      if auth.uid() is not null then new.user_id := auth.uid(); end if;
    elsif new.status = 'active' then
      if new.member_no is null or new.member_no = '' then new.member_no := public.k1_next_number(new.organization_id, 'member'); end if;
      new.decided_at := coalesce(new.decided_at, now());
      new.decided_by := coalesce(new.decided_by, auth.uid());
      new.valid_from := coalesce(new.valid_from, current_date);
    end if;
    new.mobile := regexp_replace(new.mobile, '[^0-9]', '', 'g');
    if length(new.mobile) = 10 then new.mobile := '91' || new.mobile; end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'active' and (new.member_no is null or new.member_no = '') and core.can(new.organization_id, 'org.member.approve') then
      new.member_no := public.k1_next_number(new.organization_id, 'member');
      new.decided_at := coalesce(new.decided_at, now());
      new.decided_by := coalesce(new.decided_by, auth.uid());
    end if;
    new.mobile := regexp_replace(new.mobile, '[^0-9]', '', 'g');
    if length(new.mobile) = 10 then new.mobile := '91' || new.mobile; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_org_memberships_guard on public.org_memberships;
create trigger trg_org_memberships_guard before insert or update on public.org_memberships for each row execute function public.org_memberships_guard();
