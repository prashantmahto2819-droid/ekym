do $$
declare r record;
begin
  for r in select table_name, string_agg(column_name || ':' || data_type, ', ' order by ordinal_position) c from information_schema.columns
            where table_schema = 'public' and table_name in ('member_suggestions','letters','families','members','family_links') group by 1 loop
    raise notice 'T % => %', r.table_name, r.c;
  end loop;
  for r in select p.proname, pg_get_function_identity_arguments(p.oid) a from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.proname in ('can_manage_family','is_admin','is_approved','shok_user_org','shok_home_org','guard_member_kind','notify_whatsapp_phone') loop
    raise notice 'F %(%)', r.proname, r.a;
  end loop;
  for r in select conname, pg_get_constraintdef(oid) d from pg_constraint where conrelid in ('public.letters'::regclass, 'public.member_suggestions'::regclass, 'public.members'::regclass) and contype = 'c' loop
    raise notice 'C % %', r.conname, r.d;
  end loop;
  for r in select tgname, tgrelid::regclass t from pg_trigger where not tgisinternal and tgrelid in ('public.members'::regclass,'public.families'::regclass) loop
    raise notice 'TG % on %', r.tgname, r.t;
  end loop;
end $$;
