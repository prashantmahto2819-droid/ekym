-- श्रद्धांजलि पेजों की सूची: संस्था का अपना (Kalchuri One) एडमिन भी अपनी संस्था के सारे पेज देखे
do $$
declare d text; n text; o oid;
begin
  select p.oid into o from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'shok_tributes_list';
  d := pg_get_functiondef(o);
  n := replace(d, '(public.is_admin() and public.shok_sees_org(t.organization_id))', '(public.is_admin() and public.shok_sees_org(t.organization_id)) or (t.organization_id is not null and core.can(t.organization_id, ''family.manage''))');
  if n = d then raise exception 'pattern not found'; end if;
  execute n;
end $$;
