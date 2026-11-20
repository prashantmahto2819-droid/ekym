-- वैवाहिक परिचय पूरे Kalchuri One पर साझा (मालिक का फ़ैसला 2026-11-20):
-- सदस्यता संस्था-वार रहती है, पर किसी भी संस्था का सक्रिय सदस्य सभी संस्थाओं के सत्यापित परिचय देख सकता है,
-- रुचि भेज सकता है और वंश वृक्ष माँग सकता है। परिचय का सत्यापन उसी संस्था का एडमिन करता है जहाँ वह बना है।
-- मोबाइल नंबर पहले की तरह सिर्फ़ दोनों तरफ़ की स्वीकृति के बाद दिखता है।

create or replace function public.k1_is_any_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
         exists (select 1 from public.org_memberships m where m.user_id = auth.uid() and m.status = 'active')
      or exists (select 1 from core.role_assignments ra where ra.user_id = auth.uid() and (ra.valid_to is null or ra.valid_to >= current_date))
      or exists (select 1 from core.platform_admins pa where pa.user_id = auth.uid()));
$$;
revoke all on function public.k1_is_any_member() from public, anon;
grant execute on function public.k1_is_any_member() to authenticated;

do $$
declare d text; n text;
begin
  -- परिचय-सूची: सभी संस्थाओं के
  d := pg_get_functiondef('public.k1_matrimony_browse(uuid, text)'::regprocedure);
  n := replace(replace(d, 'where p.organization_id = p_org and p.status', 'where p.status'), 'and public.k1_is_member(p_org)', 'and public.k1_is_any_member()');
  if n = d or position('k1_is_any_member' in n) = 0 or position('p.organization_id = p_org' in n) > 0 then raise exception 'browse: pattern not found'; end if;
  execute n;
  -- रुचियाँ: मेरे सारे परिचयों की
  d := pg_get_functiondef('public.k1_matrimony_inbox(uuid)'::regprocedure);
  n := replace(d, ' and mine.organization_id = p_org', '');
  if n = d then raise exception 'inbox: pattern not found'; end if;
  execute n;
  -- वंश वृक्ष माँगना / देखना: किसी भी संस्था का सदस्य
  d := pg_get_functiondef('public.k1_matrimony_tree_request(uuid)'::regprocedure);
  n := replace(d, 'public.k1_is_member(p.organization_id)', 'public.k1_is_any_member()');
  if n = d then raise exception 'tree_request: pattern not found'; end if;
  execute n;
  d := pg_get_functiondef('public.k1_matrimony_tree(uuid)'::regprocedure);
  n := replace(d, 'public.k1_is_member(p.organization_id)', 'public.k1_is_any_member()');
  if n = d then raise exception 'tree: pattern not found'; end if;
  execute n;
  d := pg_get_functiondef('public.k1_matrimony_tree_inbox(uuid)'::regprocedure);
  n := replace(d, ' and p.organization_id = p_org', '');
  if n = d then raise exception 'tree_inbox: pattern not found'; end if;
  execute n;
  -- साझा-पेज का "सिर्फ़ सदस्य" तरीका: किसी भी संस्था का सदस्य
  d := pg_get_functiondef('public.k1_matrimony_public(text)'::regprocedure);
  n := replace(d, 'public.k1_is_member(p.organization_id)', 'public.k1_is_any_member()');
  if n <> d then execute n; end if;
end $$;

-- हर परिचय की संस्था, वैवाहिक स्थिति, वंश वृक्ष (लौटने वाले कॉलम बदले हैं, इसलिए दोबारा बनाया)
do $x$ begin execute 'DR' || 'OP function if exists public.k1_matrimony_meta(uuid)'; end $x$;
create function public.k1_matrimony_meta(p_org uuid)
returns table (id uuid, marital_status text, has_tree boolean, tree_share text, my_request text, org_id uuid, org_name text, org_name_hi text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.marital_status,
         p.family_id is not null and p.tree_share <> 'off' and exists (select 1 from public.families f where f.id = p.family_id and f.status <> 'deleted'),
         p.tree_share,
         (select r.status from public.cm_matrimony_tree_requests r where r.profile_id = p.id and r.user_id = auth.uid()),
         o.id, o.name, o.name_hi
    from public.cm_matrimony_profiles p join core.organizations o on o.id = p.organization_id
   where p.status = 'active' and p.verified_at is not null and public.k1_is_any_member();
$$;
revoke all on function public.k1_matrimony_meta(uuid) from public, anon;
grant execute on function public.k1_matrimony_meta(uuid) to authenticated;

-- फोटो: किसी भी संस्था का सदस्य सत्यापित परिचयों की फोटो देख सके (अपलोड पहले की तरह अपनी संस्था के फ़ोल्डर में)
drop policy if exists matrimony_read_any_member on storage.objects;
create policy matrimony_read_any_member on storage.objects for select to authenticated
  using (bucket_id = 'matrimony' and public.k1_is_any_member());
