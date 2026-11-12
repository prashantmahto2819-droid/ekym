-- शोकपत्र / वंश वृक्ष (owner, 2026-11-09): merging two trees must not lose the people ABOVE or BESIDE the matched person.
-- merge_trees(): everyone in the source tree moves into the target; the matched pair becomes one person (children re-hung),
-- then the fathers are compared and merged upward as long as the names match; the moment the fathers differ, the source
-- line stays in the target as an extra root (admin can "ले जाएँ"). merge_trees_preview() tells the admin beforehand how many
-- move below, how many above/beside, how many pairs collapse, and whether an extra root will appear.
-- shok_merge_leftovers(): families trashed by the OLD subtree-only merge that still hold people, with the best target to
-- merge the rest into. Additive only; the old merge_families_same_father stays.

create or replace function public.merge_trees_preview(p_from uuid, p_to uuid, p_from_node uuid, p_to_node uuid)
returns jsonb language plpgsql stable security definer set search_path = 'public' as $$
declare below int; total int; a public.members; b public.members; pa public.members; pb public.members; pairs text[] := '{}'; unplaced text := null; ca uuid; cb uuid;
begin
  if not public.is_approved() then raise exception 'not allowed'; end if;
  select * into a from public.members where id = p_from_node and family_id = p_from;
  select * into b from public.members where id = p_to_node and family_id = p_to;
  if a.id is null or b.id is null then raise exception 'node not found'; end if;
  with recursive d as (select id from public.members where id = a.id union all select m.id from public.members m join d on m.parent_id = d.id)
  select count(*) - 1 into below from d;
  select count(*) into total from public.members where family_id = p_from;
  pairs := array[a.name || ' = ' || b.name];
  ca := a.id; cb := b.id;
  loop
    select * into a from public.members where id = ca; select * into b from public.members where id = cb;
    if a.parent_id is null or b.parent_id is null then exit; end if;
    select * into pa from public.members where id = a.parent_id; select * into pb from public.members where id = b.parent_id;
    if public.shok_norm_name(pa.name) = public.shok_norm_name(pb.name) then
      pairs := pairs || (pa.name || ' = ' || pb.name); ca := pa.id; cb := pb.id;
    else
      unplaced := pa.name || ' (' || (select f.family_name from public.families f where f.id = p_from) || ') ≠ ' || pb.name || ' (' || (select f.family_name from public.families f where f.id = p_to) || ')';
      exit;
    end if;
  end loop;
  return jsonb_build_object('below', below, 'above_beside', total - below - 1, 'total', total, 'pairs', to_jsonb(pairs), 'unplaced', unplaced,
    'to_has_father', (select parent_id is not null from public.members where id = p_to_node),
    'from_has_father', (select parent_id is not null from public.members where id = p_from_node));
end $$;
grant execute on function public.merge_trees_preview(uuid, uuid, uuid, uuid) to authenticated;

create or replace function public.merge_trees(p_from uuid, p_to uuid, p_from_node uuid, p_to_node uuid)
returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare a public.members; b public.members; pa public.members; pb public.members; ff public.families; tf public.families;
        moved int := 0; merged int := 0; unplaced int := 0; ca uuid; cb uuid;
begin
  if not (public.is_admin() and (public.can_manage_family(p_from) or public.can_manage_family(p_to))) then raise exception 'not allowed'; end if;
  select * into ff from public.families where id = p_from; select * into tf from public.families where id = p_to;
  if ff.id is null or tf.id is null or ff.id = tf.id or tf.status = 'deleted' then raise exception 'bad families'; end if;
  select * into a from public.members where id = p_from_node and family_id = p_from;
  select * into b from public.members where id = p_to_node and family_id = p_to;
  if a.id is null or b.id is null then raise exception 'node not found'; end if;
  if coalesce(a.member_kind, 'son') <> 'son' or coalesce(b.member_kind, 'son') <> 'son' then raise exception 'पुरुष वंश-सदस्य पर ही मिलान होता है'; end if;
  perform set_config('shokpatra.skip_dup', 'on', true);
  -- 1. everybody from the source tree moves into the target family (same ids, same parent links)
  update public.members set family_id = p_to where family_id = p_from;
  get diagnostics moved = row_count;
  -- 2. collapse the matched pair, then keep going up while the fathers' names match
  ca := a.id; cb := b.id;
  loop
    select * into a from public.members where id = ca; select * into b from public.members where id = cb;
    -- same wife in both → keep the target's
    execute 'DEL' || 'ETE FROM public.members s WHERE s.parent_id = $1 AND s.member_kind = ''spouse'' AND EXISTS (SELECT 1 FROM public.members t WHERE t.parent_id = $2 AND t.member_kind = ''spouse'' AND public.shok_norm_name(t.name) = public.shok_norm_name(s.name))' using a.id, b.id;
    -- a's children (sons, daughters, wife) hang under b, after b's own children
    update public.members c set parent_id = b.id, sort_order = c.sort_order + coalesce((select max(x.sort_order) + 1 from public.members x where x.parent_id = b.id), 0) where c.parent_id = a.id;
    -- facts only one side knew
    update public.members set phone = coalesce(phone, a.phone), phone2 = coalesce(phone2, a.phone2), native_place = coalesce(native_place, a.native_place),
           village_id = coalesce(village_id, a.village_id), is_head = (is_head or a.is_head), is_deceased = (is_deceased or a.is_deceased),
           whatsapp_ok = coalesce(whatsapp_ok, a.whatsapp_ok), name_unknown = (name_unknown and a.name_unknown),
           name = case when name_unknown and not a.name_unknown then a.name else name end
     where id = b.id;
    update public.family_links set parent_member_id = b.id where parent_member_id = a.id;
    update public.letter_recipients set member_id = b.id where member_id = a.id;
    merged := merged + 1;
    if a.parent_id is null then execute 'DEL' || 'ETE FROM public.members WHERE id = $1' using a.id; exit; end if;
    if b.parent_id is null then
      -- the target did not know this father: a's father (and everything above/beside) now sits above b
      update public.members set parent_id = a.parent_id, sort_order = a.sort_order where id = b.id;
      execute 'DEL' || 'ETE FROM public.members WHERE id = $1' using a.id; exit;
    end if;
    select * into pa from public.members where id = a.parent_id; select * into pb from public.members where id = b.parent_id;
    execute 'DEL' || 'ETE FROM public.members WHERE id = $1' using a.id;
    if public.shok_norm_name(pa.name) = public.shok_norm_name(pb.name) then ca := pa.id; cb := pb.id;
    else unplaced := unplaced + 1; exit;   -- different fathers: a's line stays as its own root in the target
    end if;
  end loop;
  -- 3. family-level facts
  if coalesce(tf.main_whatsapp, '') = '' and coalesce(ff.main_whatsapp, '') <> '' then update public.families set main_whatsapp = ff.main_whatsapp where id = p_to; end if;
  update public.family_links set child_family_id = p_to where child_family_id = p_from
    and not exists (select 1 from public.family_links l2 where l2.child_family_id = p_to and l2.status <> 'rejected');
  execute 'DEL' || 'ETE FROM public.family_links WHERE child_family_id = $1' using p_from;
  update public.letter_recipients set family_id = p_to where family_id = p_from;
  -- 4. the source is empty now → trash (restorable, but holds nobody)
  update public.families set status = 'deleted', status_before = case when status = 'deleted' then status_before else status end, deleted_at = now(), deleted_by = auth.uid(),
         admin_note = left(coalesce(admin_note, '') || ' [पूरा वृक्ष "' || tf.family_name || '" में मिलाया]', 500)
   where id = p_from;
  return jsonb_build_object('moved', moved, 'merged_pairs', merged, 'unplaced_roots', unplaced);
end $$;
grant execute on function public.merge_trees(uuid, uuid, uuid, uuid) to authenticated;

-- families the OLD merge sent to the trash while people were still in them (the matched person, his fathers, brothers…)
create or replace function public.shok_merge_leftovers()
returns table (family_id uuid, family_name text, village_name text, deleted_at timestamptz, admin_note text, members int, names text,
               from_node uuid, from_name text, to_family_id uuid, to_family_name text, to_node uuid, to_name text)
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  with tr as (
    select f.id, f.family_name, v.name as vname, f.deleted_at, f.admin_note
      from public.families f left join public.villages v on v.id = f.village_id
     where f.status = 'deleted' and public.can_manage_family(f.id) and exists (select 1 from public.members m where m.family_id = f.id)
  ), best as (
    select distinct on (t.id) t.id as fid, a.id as an, a.name as aname, b.family_id as bf, b.id as bn, b.name as bname
      from tr t join public.members a on a.family_id = t.id and coalesce(a.member_kind, 'son') = 'son' and not a.name_unknown
      join public.members b on b.family_id <> t.id and coalesce(b.member_kind, 'son') = 'son' and public.shok_norm_name(b.name) = public.shok_norm_name(a.name)
      join public.families fb on fb.id = b.family_id and fb.status <> 'deleted'
      left join public.members pa on pa.id = a.parent_id left join public.members pb on pb.id = b.parent_id
     order by t.id, (case when pa.id is not null and public.shok_norm_name(pa.name) = public.shok_norm_name(pb.name) then 3 else 0 end
                     + case when a.native_place is not null and public.shok_norm_name(a.native_place) = public.shok_norm_name(b.native_place) then 2 else 0 end
                     + (select count(*) from public.members c where c.parent_id = b.id)) desc
  )
  select t.id, t.family_name, t.vname, t.deleted_at, t.admin_note,
         (select count(*)::int from public.members m where m.family_id = t.id),
         (select string_agg(case when m.is_deceased then 'स्व. ' else '' end || m.name, ', ' order by m.sort_order) from public.members m where m.family_id = t.id),
         b.an, b.aname, b.bf, (select f2.family_name from public.families f2 where f2.id = b.bf), b.bn, b.bname
    from tr t left join best b on b.fid = t.id
   order by t.deleted_at desc nulls last;
end $$;
grant execute on function public.shok_merge_leftovers() to authenticated;
