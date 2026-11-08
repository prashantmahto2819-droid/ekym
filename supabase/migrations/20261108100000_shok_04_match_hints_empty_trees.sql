-- शोकपत्र / वंश वृक्ष (owner, 2026-11-08):
-- 1. "same name in another tree" recommendations — for the person building a tree (right after adding a member),
--    on the family page, and an automatic list for admins (digest counts them) so duplicated branches get merged or linked.
-- 2. empty trees — families that still have no members (or only the head) are listed for admins and counted in the digest.
-- Additive only: no table is dropped or renamed.

-- name normalisation for matching: lower-case, honorifics removed, single spaces
create or replace function public.shok_norm_name(t text) returns text
language sql immutable as $$
  select nullif(btrim(regexp_replace(
           regexp_replace(lower(coalesce(t, '')), '(^|\s)(स्व\.|स्व|स्वर्गीय|श्री|श्रीमती|जी|सा\.|साहब)(?=\s|$)', ' ', 'g'),
           '\s+', ' ', 'g')), '')
$$;

create index if not exists members_norm_name_idx on public.members (public.shok_norm_name(name));

-- admin/owner said "these two are not the same person" (or "leave it"): hide the pair
create table if not exists public.shok_match_dismissals (
  member_a uuid not null references public.members(id) on delete cascade,
  member_b uuid not null references public.members(id) on delete cascade,
  dismissed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (member_a, member_b),
  check (member_a < member_b)
);
alter table public.shok_match_dismissals enable row level security;
-- no direct client access; RPCs below

create or replace function public.shok_dismiss_match(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = 'public' as $$
declare fa uuid; fb uuid;
begin
  if not public.is_approved() then raise exception 'not allowed'; end if;
  select family_id into fa from public.members where id = p_a;
  select family_id into fb from public.members where id = p_b;
  if fa is null or fb is null then raise exception 'not found'; end if;
  if not (public.is_admin() and (public.can_manage_family(fa) or public.can_manage_family(fb))
          or exists (select 1 from public.families f where f.id in (fa, fb) and f.owner_id = auth.uid())) then
    raise exception 'not allowed';
  end if;
  insert into public.shok_match_dismissals (member_a, member_b, dismissed_by)
  values (least(p_a, p_b), greatest(p_a, p_b), auth.uid()) on conflict do nothing;
end $$;
grant execute on function public.shok_dismiss_match(uuid, uuid) to authenticated;

-- Members of p_family (or just p_member) whose name also appears in another tree. Score: same father +3, same मूल ग्राम +2,
-- same residence village +1, both roots (no father known) +1. link_parent_id = the other person's father, when this one is a root
-- of his tree (so the whole family can be linked under that father). No phones are returned.
create or replace function public.shok_similar_members(p_family uuid, p_member uuid default null, p_min_score int default 2)
returns table (member_id uuid, member_name text, father_name text, other_member_id uuid, other_name text, other_father text,
               other_family_id uuid, other_family_name text, other_family_status text, other_village text, other_native text,
               other_is_root boolean, link_parent_id uuid, score int, reason text)
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if not public.is_approved() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.families f where f.id = p_family and f.status <> 'deleted'
                 and (f.owner_id = auth.uid() or public.can_manage_family(f.id) or f.status = 'approved')) then
    raise exception 'not allowed';
  end if;
  return query
  with mine as (
    select m.id, m.name, m.parent_id, m.native_place, coalesce(m.village_id, f.village_id) as vid,
           public.shok_norm_name(m.name) as nn, public.shok_norm_name(p.name) as fn
      from public.members m join public.families f on f.id = m.family_id
      left join public.members p on p.id = m.parent_id
     where m.family_id = p_family and not m.name_unknown and coalesce(m.member_kind, 'son') = 'son'
       and (p_member is null or m.id = p_member)
  ), others as (
    select o.id, o.name, o.parent_id, o.native_place, coalesce(o.village_id, f.village_id) as vid, f.id as fid, f.family_name, f.status as fstatus,
           public.shok_norm_name(o.name) as nn, public.shok_norm_name(p.name) as fn, v.name as vname
      from public.members o join public.families f on f.id = o.family_id
      left join public.members p on p.id = o.parent_id
      left join public.villages v on v.id = coalesce(o.village_id, f.village_id)
     where o.family_id <> p_family and f.status <> 'deleted' and not o.name_unknown and coalesce(o.member_kind, 'son') = 'son'
       and (f.status = 'approved' or f.owner_id = auth.uid() or public.can_manage_family(f.id))
  ), pairs as (
    select m.id as mid, m.name as mname, m.fn as mfn, m.native_place as mnative, m.vid as mvid, m.parent_id as m_parent, o.*,
           (case when m.fn is not null and m.fn = o.fn then 3 else 0 end
          + case when m.native_place is not null and public.shok_norm_name(m.native_place) = public.shok_norm_name(o.native_place) then 2 else 0 end
          + case when m.vid is not null and m.vid = o.vid then 1 else 0 end
          + case when m.parent_id is null and o.parent_id is null then 1 else 0 end) as sc
      from mine m join others o on o.nn = m.nn
     where m.nn is not null
       and not exists (select 1 from public.shok_match_dismissals d where d.member_a = least(m.id, o.id) and d.member_b = greatest(m.id, o.id))
  )
  select p.mid, p.mname, p.mfn, p.id, p.name, p.fn, p.fid, p.family_name, p.fstatus, p.vname, p.native_place,
         p.parent_id is null, case when p.m_parent is null then p.parent_id end, p.sc,
         concat_ws(' · ', case when p.mfn is not null and p.mfn = p.fn then 'पिता का नाम भी मिलता है' end,
                          case when p.mnative is not null and public.shok_norm_name(p.mnative) = public.shok_norm_name(p.native_place) then 'मूल ग्राम मिलता है' end,
                          case when p.mvid is not null and p.mvid = p.vid then 'निवास मिलता है' end,
                          case when p.m_parent is null and p.parent_id is null then 'दोनों जगह सबसे ऊपर' end)
    from pairs p
   where p.sc >= p_min_score
   order by p.sc desc, p.mname;
end $$;
grant execute on function public.shok_similar_members(uuid, uuid, int) to authenticated;

-- Admin: all open recommendations across the families they manage (one row per pair, best score first).
create or replace function public.shok_match_hints(p_limit int default 100)
returns table (member_id uuid, member_name text, family_id uuid, family_name text, family_status text,
               other_member_id uuid, other_name text, other_family_id uuid, other_family_name text, other_family_status text,
               link_parent_id uuid, score int, reason text)
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with m as (
    select x.id, x.name, x.parent_id, x.native_place, coalesce(x.village_id, f.village_id) as vid, x.family_id,
           public.shok_norm_name(x.name) as nn, public.shok_norm_name(p.name) as fn
      from public.members x join public.families f on f.id = x.family_id
      left join public.members p on p.id = x.parent_id
     where f.status in ('draft', 'pending', 'approved') and not x.name_unknown and coalesce(x.member_kind, 'son') = 'son'
  ), pairs as (
    select a.id as aid, a.name as aname, a.family_id as afid, b.id as bid, b.name as bname, b.family_id as bfid,
           case when a.parent_id is null then b.parent_id end as lp,
           (case when a.fn is not null and a.fn = b.fn then 3 else 0 end
          + case when a.native_place is not null and public.shok_norm_name(a.native_place) = public.shok_norm_name(b.native_place) then 2 else 0 end
          + case when a.vid is not null and a.vid = b.vid then 1 else 0 end
          + case when a.parent_id is null and b.parent_id is null then 1 else 0 end) as sc,
           concat_ws(' · ', case when a.fn is not null and a.fn = b.fn then 'पिता का नाम भी मिलता है' end,
                            case when a.native_place is not null and public.shok_norm_name(a.native_place) = public.shok_norm_name(b.native_place) then 'मूल ग्राम मिलता है' end,
                            case when a.vid is not null and a.vid = b.vid then 'निवास मिलता है' end,
                            case when a.parent_id is null and b.parent_id is null then 'दोनों जगह सबसे ऊपर' end) as why
      from m a join m b on b.nn = a.nn and b.family_id <> a.family_id and a.id < b.id
     where a.nn is not null and public.can_manage_family(a.family_id)
       and not exists (select 1 from public.shok_match_dismissals d where d.member_a = a.id and d.member_b = b.id)
  )
  select p.aid, p.aname, fa.id, fa.family_name, fa.status, p.bid, p.bname, fb.id, fb.family_name, fb.status, p.lp, p.sc, p.why
    from pairs p join public.families fa on fa.id = p.afid join public.families fb on fb.id = p.bfid
   where p.sc >= 2
   order by p.sc desc, p.aname limit p_limit;
end $$;
grant execute on function public.shok_match_hints(int) to authenticated;

create or replace function public.shok_match_hint_count()
returns int language sql stable security definer set search_path = 'public' as $$
  select count(*)::int from public.shok_match_hints(1000);
$$;
grant execute on function public.shok_match_hint_count() to authenticated;

-- Empty trees: no members, or only the head, and older than a day. Admins see the ones they manage; owners their own.
create or replace function public.shok_empty_families()
returns table (id uuid, family_name text, village_name text, status text, members int, created_at timestamptz, owner_id uuid,
               owner_name text, owner_phone text, main_whatsapp text, mine boolean)
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if not public.is_approved() then raise exception 'not allowed'; end if;
  return query
  select f.id, f.family_name, v.name, f.status, (select count(*)::int from public.members m where m.family_id = f.id),
         f.created_at, f.owner_id, pr.full_name,
         case when public.is_admin() and public.can_manage_family(f.id) then pr.phone end,
         case when (public.is_admin() and public.can_manage_family(f.id)) or f.owner_id = auth.uid() then f.main_whatsapp end,
         f.owner_id = auth.uid()
    from public.families f left join public.villages v on v.id = f.village_id left join public.profiles pr on pr.id = f.owner_id
   where f.status <> 'deleted' and f.created_at < now() - interval '1 day'
     and (select count(*) from public.members m where m.family_id = f.id) <= 1
     and (f.owner_id = auth.uid() or (public.is_admin() and public.can_manage_family(f.id)))
   order by f.created_at;
end $$;
grant execute on function public.shok_empty_families() to authenticated;

-- digest: add recommendation + empty-tree counts (nothing else changed)
create or replace function public.send_admin_digest()
returns void language plpgsql security definer set search_path = 'public' as $$
declare r record; fam int; sug int; lnk int; org int; sp int; emp int; hint int; msg text; main_phone text;
begin
  select regexp_replace(coalesce(value, ''), '\D', '', 'g') into main_phone from public.app_settings where key = 'admin_notify_phone';
  for r in
    select main_phone as phone, null::uuid as admin_id where coalesce(main_phone, '') <> ''
    union all
    select regexp_replace(p.phone, '\D', '', 'g'), p.id from public.profiles p
      where p.role = 'admin' and p.status = 'approved' and coalesce(p.phone, '') <> ''
        and (exists (select 1 from public.admin_villages av where av.admin_id = p.id) or exists (select 1 from public.admin_regions ar where ar.admin_id = p.id))
  loop
    select count(*) into fam from public.families f where f.status = 'pending' and (r.admin_id is null or public.admin_can_manage_family(r.admin_id, f.id));
    select count(*) into sug from public.member_suggestions s where s.status = 'pending' and (r.admin_id is null or public.admin_can_manage_family(r.admin_id, s.family_id));
    select count(*) into lnk from public.family_links l join public.members pm on pm.id = l.parent_member_id
      where l.status = 'pending' and (r.admin_id is null or public.admin_can_manage_family(r.admin_id, l.child_family_id) or public.admin_can_manage_family(r.admin_id, pm.family_id));
    select count(*) into sp from public.same_person_requests q where q.status = 'pending' and (r.admin_id is null or public.admin_can_manage_family(r.admin_id, q.family_id));
    org := case when r.admin_id is null then (select count(*) from public.origin_requests where status = 'pending') else 0 end;
    select count(*) into emp from public.families f where f.status <> 'deleted' and f.created_at < now() - interval '1 day'
      and (select count(*) from public.members m where m.family_id = f.id) <= 1 and (r.admin_id is null or public.admin_can_manage_family(r.admin_id, f.id));
    -- same-name pairs across trees (not dismissed), scoped like the rest
    select count(*) into hint from (
      select a.id from public.members a join public.members b on b.id > a.id and b.family_id <> a.family_id and public.shok_norm_name(b.name) = public.shok_norm_name(a.name)
        join public.families fa on fa.id = a.family_id and fa.status in ('draft','pending','approved')
        join public.families fb on fb.id = b.family_id and fb.status in ('draft','pending','approved')
        left join public.members pa on pa.id = a.parent_id left join public.members pb on pb.id = b.parent_id
       where not a.name_unknown and not b.name_unknown and coalesce(a.member_kind,'son') = 'son' and coalesce(b.member_kind,'son') = 'son'
         and public.shok_norm_name(a.name) is not null
         and (r.admin_id is null or public.admin_can_manage_family(r.admin_id, fa.id))
         and not exists (select 1 from public.shok_match_dismissals d where d.member_a = a.id and d.member_b = b.id)
         and ((pa.id is not null and public.shok_norm_name(pa.name) = public.shok_norm_name(pb.name))
              or (a.native_place is not null and public.shok_norm_name(a.native_place) = public.shok_norm_name(b.native_place))
              or (a.parent_id is null and b.parent_id is null and coalesce(a.village_id, fa.village_id) = coalesce(b.village_id, fb.village_id)))
    ) x;
    if fam + sug + lnk + org + sp + emp + hint > 0 then
      msg := 'शोकपत्र सेवा: ध्यान देने योग्य' || case when fam > 0 then E'\nपरिवार मंज़ूरी बाकी: ' || fam else '' end
        || case when sug > 0 then E'\nट्री में नाम के सुझाव: ' || sug else '' end
        || case when lnk > 0 then E'\nवंश जोड़ने के अनुरोध: ' || lnk else '' end
        || case when sp > 0 then E'\n"यही व्यक्ति है" के अनुरोध: ' || sp else '' end
        || case when org > 0 then E'\nनए मूल ग्राम के अनुरोध: ' || org else '' end
        || case when hint > 0 then E'\nएक जैसे नाम दूसरे वंश वृक्ष में (मिलाने के सुझाव): ' || hint else '' end
        || case when emp > 0 then E'\nखाली वंश वृक्ष (अभी भी बिना सदस्य): ' || emp else '' end
        || E'\nदेखिए: https://shokpatra.kalchuri.org/app.html#/approvals';
      perform public.notify_whatsapp_phone(r.phone, msg);
    end if;
  end loop;
end $$;
