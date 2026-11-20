-- नई सुविधाएँ (इतिहास, फोटो / परिचय, विवाह की कड़ी, श्रद्धांजलि) हर संस्था के अपने एडमिन के लिए भी:
-- पहले इनमें public.is_admin() (सिर्फ़ शोकपत्र ऐप के एडमिन) की शर्त थी; can_manage_family() अपने आप में
-- "इस परिवार को सँभालने वाला एडमिन" जाँचता है और Kalchuri One की भूमिका (family.manage) वाले एडमिन को भी गिनता है।
do $$
declare r record; d text; n text;
begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.proname in ('shok_family_history', 'shok_family_visible', 'shok_member_profile_save') loop
    d := pg_get_functiondef(r.oid);
    n := replace(d, 'public.is_admin() and public.can_manage_family', 'public.can_manage_family');
    if n = d then raise exception 'pattern not found in %', r.proname; end if;
    execute n;
  end loop;
  for r in select p.oid, p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.proname in ('shok_marriage_link', 'shok_marriage_unlink') loop
    d := pg_get_functiondef(r.oid);
    n := replace(d, 'if not public.is_admin() then raise exception ''यह काम सिर्फ़ एडमिन कर सकते हैं''; end if;', '');
    if n = d then raise exception 'pattern not found in %', r.proname; end if;
    execute n;
  end loop;
end $$;

-- श्रद्धांजलि पेज: बनाने वाला, शोकपत्र ऐप का एडमिन (अपनी संस्था), या उस संस्था का Kalchuri One एडमिन
create or replace function public.shok_tribute_can(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shok_tributes t where t.id = p_id
                  and (t.created_by = auth.uid()
                       or (public.is_admin() and public.shok_sees_org(t.organization_id))
                       or (t.organization_id is not null and core.can(t.organization_id, 'family.manage'))));
$$;
revoke all on function public.shok_tribute_can(uuid) from public, anon, authenticated;
