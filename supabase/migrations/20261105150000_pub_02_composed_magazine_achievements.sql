-- Kalchuri One · magazine composed from content (blogs, news, achievements, announcements, custom pieces),
-- achievements (समाज की उपलब्धियाँ) with member submission + approval, bios for office bearers.
-- Kalchuri One's own magazine may pull items from every member organization (root scope).

-- ---------- achievements ----------
create table if not exists public.cm_achievements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  person_name text not null, person_name_hi text,
  title text not null, title_hi text,
  description text, description_hi text,
  category text not null default 'other' check (category in ('education','sports','service','business','award','culture','other')),
  photo_path text,
  achieved_on date,
  village text,
  membership_id uuid references public.org_memberships(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  featured boolean not null default false,
  admin_note text,
  decided_by uuid, decided_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists cm_achievements_org_idx on public.cm_achievements(organization_id, status, achieved_on desc);
alter table public.cm_achievements enable row level security;
create policy cm_ach_public_read on public.cm_achievements for select to anon, authenticated using (status = 'approved');
create policy cm_ach_own_read on public.cm_achievements for select to authenticated using (submitted_by = (select auth.uid()));
create policy cm_ach_manage on public.cm_achievements for all to authenticated using (core.can(organization_id, 'cms.post.publish')) with check (core.can(organization_id, 'cms.post.publish'));
create trigger trg_cm_achievements_updated before update on public.cm_achievements for each row execute function public.set_updated_at();

-- members submit; admins (cms.post.publish) approve
create or replace function public.k1_achievement_submit(p_org uuid, p_person text, p_person_hi text, p_title text, p_title_hi text, p_description text, p_category text, p_photo text, p_achieved_on date, p_village text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare id uuid; mid uuid;
begin
  if not public.k1_is_member(p_org) then raise exception 'Members only'; end if;
  if (select count(*) from public.cm_achievements a where a.submitted_by = auth.uid() and a.status = 'pending') >= 10 then raise exception 'Too many pending submissions'; end if;
  select m.id into mid from public.org_memberships m where m.user_id = auth.uid() and m.organization_id = p_org and m.status = 'active' limit 1;
  insert into public.cm_achievements(organization_id, person_name, person_name_hi, title, title_hi, description, category, photo_path, achieved_on, village, membership_id, submitted_by)
  values (p_org, trim(p_person), nullif(trim(p_person_hi), ''), trim(p_title), nullif(trim(p_title_hi), ''), nullif(trim(p_description), ''), coalesce(p_category, 'other'), p_photo, p_achieved_on, nullif(trim(p_village), ''), mid, auth.uid())
  returning cm_achievements.id into id;
  perform public.k1_admin_notify(p_org, 'cms.post.publish', 'achievement', '🏅 नई उपलब्धि जमा: ' || trim(p_person) || ' — ' || trim(p_title), 'मंज़ूरी बाकी', '/admin/achievements', 'cm_achievements', id, false);
  return id;
end $$;
grant execute on function public.k1_achievement_submit(uuid, text, text, text, text, text, text, text, date, text) to authenticated;

create or replace function public.k1_achievement_decide(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.cm_achievements;
begin
  select * into a from public.cm_achievements where id = p_id;
  if a is null then raise exception 'Not found'; end if;
  if not core.can(a.organization_id, 'cms.post.publish') then raise exception 'Not allowed'; end if;
  update public.cm_achievements set status = case when p_approve then 'approved' else 'rejected' end, admin_note = p_note, decided_by = auth.uid(), decided_at = now() where id = p_id;
  if a.submitted_by is not null then
    perform public.k1_notify_user(a.organization_id, a.submitted_by, case when p_approve then '🏅 उपलब्धि प्रकाशित: ' else 'उपलब्धि पर निर्णय: ' end || a.title,
      case when p_approve then a.person_name || ' की उपलब्धि "' || a.title || '" संस्था की वेबसाइट पर प्रकाशित हो गई है।' else 'क्षमा करें, यह उपलब्धि प्रकाशित नहीं हो सकी।' || coalesce(E'\n' || 'कारण: ' || p_note, '') end,
      '/achievements', 'cm_achievements', a.id);
  end if;
end $$;
grant execute on function public.k1_achievement_decide(uuid, boolean, text) to authenticated;

-- ---------- office bearers: bio ----------
alter table public.gov_positions add column if not exists about text, add column if not exists about_hi text, add column if not exists email_public boolean not null default false;
create or replace view public.gov_positions_public with (security_invoker = false) as
  select p.id, p.organization_id, p.committee_id, p.person_name, p.person_name_hi, p.designation, p.designation_hi, p.rank,
         case when p.show_phone_public then p.phone end as phone,
         p.photo_path, p.city, p.from_date, p.to_date,
         case when p.email_public then p.email end as email, p.about, p.about_hi
    from public.gov_positions p where p.show_public;
grant select on public.gov_positions_public to anon, authenticated;

-- ---------- composed magazine ----------
alter table public.pub_issues
  add column if not exists articles jsonb not null default '[]'::jsonb,   -- [{id,type:'blog'|'news'|'achievement'|'announcement'|'custom',ref,org,section,title,title_hi,body,body_hi,image,author}]
  add column if not exists editorial text, add column if not exists editorial_hi text, add column if not exists editor_name text,
  add column if not exists theme jsonb not null default '{}'::jsonb;   -- {layout:'classic'|'modern'|'newspaper', accent:'#..', paper:'#..', ink:'#..', font:'serif'|'sans'|'devanagari', columns:1|2, cover:'image'|'band'|'minimal'}

-- picker: content the editor may put into an issue. Own organization; the root (Kalchuri One) magazine sees every active organization.
create or replace function public.k1_magazine_sources(p_org uuid, p_kind text, p_q text default null, p_limit int default 40)
returns table (id uuid, kind text, title text, title_hi text, org_id uuid, org_name text, published_at timestamptz, image text, excerpt text)
language sql stable security definer set search_path = '' as $$
  with scope as (
    select o.id from core.organizations o
     where o.status = 'active' and (o.id = p_org or (exists (select 1 from core.organizations r where r.id = p_org and r.parent_id is null)
                                                     and exists (select 1 from core.org_tree t where t.ancestor_id = p_org and t.descendant_id = o.id)))
  ), q as (select lower(coalesce(trim(p_q), '')) t)
  select x.* from (
    select b.id, 'blog'::text, b.title, b.title_hi, b.organization_id, coalesce(o.name_hi, o.name), b.published_at, b.featured_image, b.excerpt
      from public.blogs b join scope s on s.id = b.organization_id join core.organizations o on o.id = b.organization_id
     where b.status = 'published' and (p_kind is null or p_kind = 'blog')
    union all
    select n.id, 'news', n.title, n.title_hi, n.organization_id, coalesce(o.name_hi, o.name), n.published_at, n.thumbnail, n.description
      from public.news n join scope s on s.id = n.organization_id join core.organizations o on o.id = n.organization_id
     where n.status = 'published' and (p_kind is null or p_kind = 'news')
    union all
    select a.id, 'achievement', a.person_name || ' — ' || a.title, coalesce(a.person_name_hi, a.person_name) || ' — ' || coalesce(a.title_hi, a.title), a.organization_id, coalesce(o.name_hi, o.name), a.achieved_on::timestamptz, a.photo_path, a.description
      from public.cm_achievements a join scope s on s.id = a.organization_id join core.organizations o on o.id = a.organization_id
     where a.status = 'approved' and (p_kind is null or p_kind = 'achievement')
    union all
    select g.id, 'announcement', g.title, g.title_hi, g.organization_id, coalesce(o.name_hi, o.name), g.publish_at, null, left(g.body, 200)
      from public.gov_announcements g join scope s on s.id = g.organization_id join core.organizations o on o.id = g.organization_id
     where (p_kind is null or p_kind = 'announcement')
  ) x(id, kind, title, title_hi, org_id, org_name, published_at, image, excerpt), q
  where (core.can(p_org, 'pub.*') or core.can(p_org, 'pub.issue.manage') or core.can(p_org, 'cms.post.publish'))
    and (q.t = '' or lower(coalesce(x.title, '')) like '%' || q.t || '%' or lower(coalesce(x.title_hi, '')) like '%' || q.t || '%')
  order by x.published_at desc nulls last limit least(p_limit, 200);
$$;
grant execute on function public.k1_magazine_sources(uuid, text, text, int) to authenticated;

-- reader: resolve every article of a published issue with its current content
create or replace function public.k1_issue_articles(p_issue uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare i public.pub_issues; a jsonb; out jsonb := '[]'::jsonb; r jsonb; k text; ref uuid;
begin
  select * into i from public.pub_issues where id = p_issue;
  if i is null then return out; end if;
  if i.status <> 'published' and not core.can(i.organization_id, 'cms.post.publish') then return out; end if;
  if i.access = 'members' and not public.k1_is_member(i.organization_id) and not core.can(i.organization_id, 'cms.post.publish') then return out; end if;
  for a in select * from jsonb_array_elements(i.articles) loop
    k := a->>'type'; ref := nullif(a->>'ref', '')::uuid; r := a;
    if k = 'blog' and ref is not null then
      select r || jsonb_build_object('title', coalesce(a->>'title', b.title), 'title_hi', coalesce(a->>'title_hi', b.title_hi), 'body', b.content, 'body_hi', b.content_hi, 'image', coalesce(a->>'image', b.featured_image), 'author', coalesce(a->>'author', b.author_name), 'date', b.published_at, 'org_name', coalesce(o.name_hi, o.name), 'link', '/blogs/' || b.slug)
        into r from public.blogs b join core.organizations o on o.id = b.organization_id where b.id = ref and b.status = 'published';
    elsif k = 'news' and ref is not null then
      select r || jsonb_build_object('title', coalesce(a->>'title', n.title), 'title_hi', coalesce(a->>'title_hi', n.title_hi), 'body', coalesce(n.content, n.description), 'body_hi', coalesce(n.content_hi, n.description_hi), 'image', coalesce(a->>'image', n.thumbnail), 'author', coalesce(a->>'author', n.author_name, n.source_name), 'date', n.published_at, 'org_name', coalesce(o.name_hi, o.name), 'link', '/news/' || n.slug)
        into r from public.news n join core.organizations o on o.id = n.organization_id where n.id = ref and n.status = 'published';
    elsif k = 'achievement' and ref is not null then
      select r || jsonb_build_object('title', coalesce(a->>'title', x.person_name || ' — ' || x.title), 'title_hi', coalesce(a->>'title_hi', coalesce(x.person_name_hi, x.person_name) || ' — ' || coalesce(x.title_hi, x.title)), 'body', x.description, 'body_hi', x.description_hi, 'image', coalesce(a->>'image', x.photo_path), 'author', x.village, 'date', x.achieved_on, 'org_name', coalesce(o.name_hi, o.name), 'category', x.category)
        into r from public.cm_achievements x join core.organizations o on o.id = x.organization_id where x.id = ref and x.status = 'approved';
    elsif k = 'announcement' and ref is not null then
      select r || jsonb_build_object('title', coalesce(a->>'title', g.title), 'title_hi', coalesce(a->>'title_hi', g.title_hi), 'body', g.body, 'body_hi', g.body_hi, 'date', g.publish_at, 'org_name', coalesce(o.name_hi, o.name))
        into r from public.gov_announcements g join core.organizations o on o.id = g.organization_id where g.id = ref;
    end if;
    if r is not null then out := out || jsonb_build_array(r); end if;
  end loop;
  return out;
end $$;
grant execute on function public.k1_issue_articles(uuid) to anon, authenticated;

-- editors save the composition (RLS on pub_issues already limits writes to the organization's publishers)
create or replace function public.k1_issue_set_articles(p_issue uuid, p_articles jsonb, p_editorial text default null, p_editorial_hi text default null, p_editor text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.pub_issues;
begin
  select * into i from public.pub_issues where id = p_issue;
  if i is null then raise exception 'Not found'; end if;
  if not (core.can(i.organization_id, 'pub.*') or core.can(i.organization_id, 'pub.issue.manage') or core.can(i.organization_id, 'cms.post.publish')) then raise exception 'Not allowed'; end if;
  update public.pub_issues set articles = coalesce(p_articles, '[]'::jsonb), editorial = p_editorial, editorial_hi = p_editorial_hi, editor_name = p_editor, updated_at = now() where id = p_issue;
end $$;
grant execute on function public.k1_issue_set_articles(uuid, jsonb, text, text, text) to authenticated;

create or replace function public.k1_issue_set_theme(p_issue uuid, p_theme jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.pub_issues;
begin
  select * into i from public.pub_issues where id = p_issue;
  if i is null then raise exception 'Not found'; end if;
  if not (core.can(i.organization_id, 'pub.*') or core.can(i.organization_id, 'pub.issue.manage') or core.can(i.organization_id, 'cms.post.publish')) then raise exception 'Not allowed'; end if;
  update public.pub_issues set theme = coalesce(p_theme, '{}'::jsonb), updated_at = now() where id = p_issue;
end $$;
grant execute on function public.k1_issue_set_theme(uuid, jsonb) to authenticated;
