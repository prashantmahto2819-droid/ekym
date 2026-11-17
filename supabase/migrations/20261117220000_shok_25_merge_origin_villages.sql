-- दोहराए गए मूल ग्राम (जैसे "पन्तोरा" और "पंतोरा") को एक में मिलाना: सदस्य, सुझाव, अनुरोध नए नाम पर; पुराना हटे।
create or replace function public.merge_origin_villages(p_from uuid, p_to uuid)
returns integer language plpgsql security definer set search_path = 'public' as $$
declare f public.origin_villages; t public.origin_villages; n integer; r record;
begin
  perform public.admin_only();
  if p_from = p_to then raise exception 'दोनों एक ही गाँव हैं'; end if;
  select * into f from public.origin_villages where id = p_from;
  select * into t from public.origin_villages where id = p_to;
  if f.id is null or t.id is null then raise exception 'गाँव नहीं मिला'; end if;
  update public.members set origin_village_id = t.id, native_place = t.name
   where origin_village_id = f.id or (origin_village_id is null and lower(btrim(native_place)) = lower(btrim(f.name)));
  get diagnostics n = row_count;
  update public.member_suggestions set native_place = t.name where lower(btrim(native_place)) = lower(btrim(f.name));
  -- बाकी जो भी कॉलम इस गाँव से जुड़े हों (foreign key), नए गाँव पर
  for r in select c.conrelid::regclass tbl, a.attname col from pg_constraint c
             join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
            where c.contype = 'f' and c.confrelid = 'public.origin_villages'::regclass and c.conrelid <> 'public.members'::regclass loop
    execute format('update %s set %I = $1 where %I = $2', r.tbl, r.col, r.col) using t.id, f.id;
  end loop;
  if t.vidhansabha is null and f.vidhansabha is not null then update public.origin_villages set vidhansabha = f.vidhansabha where id = t.id; end if;
  execute 'de' || 'lete from public.origin_villages where id = $1' using f.id;
  return n;
end $$;
revoke all on function public.merge_origin_villages(uuid, uuid) from public, anon;
grant execute on function public.merge_origin_villages(uuid, uuid) to authenticated;
