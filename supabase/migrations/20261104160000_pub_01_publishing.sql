-- Kalchuri One · Phase 8 · publishing: editorial workflow on blogs/news, categories, comments, central feed, magazine issues.
-- Additive on the existing website tables (blogs, news keep serving the public pages).

-- ---------- categories ----------
create table public.cms_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references core.organizations(id) on delete cascade,   -- null = shared
  kind text not null default 'blog' check (kind in ('blog','news','both')),
  name text not null, name_hi text,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);
alter table public.cms_categories enable row level security;
create policy cms_categories_read on public.cms_categories for select using (true);
create policy cms_categories_write on public.cms_categories for all to authenticated
  using (organization_id is not null and core.can(organization_id, 'cms.post.publish')) with check (organization_id is not null and core.can(organization_id, 'cms.post.publish'));
grant select on public.cms_categories to anon, authenticated;
grant insert, update, delete on public.cms_categories to authenticated;

-- ---------- editorial columns on blogs + news ----------
alter table public.blogs
  add column if not exists category_id uuid references public.cms_categories(id) on delete set null,
  add column if not exists tags text[] not null default '{}',
  add column if not exists author_name text,
  add column if not exists review_note text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists central_status text not null default 'none' check (central_status in ('none','nominated','approved','declined')),
  add column if not exists views int not null default 0,
  add column if not exists featured boolean not null default false;
alter table public.news
  add column if not exists category_id uuid references public.cms_categories(id) on delete set null,
  add column if not exists tags text[] not null default '{}',
  add column if not exists author_name text,
  add column if not exists content text,
  add column if not exists content_hi text,
  add column if not exists review_note text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists central_status text not null default 'none' check (central_status in ('none','nominated','approved','declined')),
  add column if not exists views int not null default 0,
  add column if not exists featured boolean not null default false,
  add column if not exists breaking boolean not null default false;
create index if not exists blogs_central_idx on public.blogs(central_status) where central_status = 'approved';
create index if not exists news_central_idx on public.news(central_status) where central_status = 'approved';

-- authors (cms.post.create) write their own drafts; reviewers (cms.post.review) read everything in the org
create policy blogs_author_read on public.blogs for select to authenticated using (created_by = auth.uid() or core.can(organization_id, 'cms.post.review'));
create policy blogs_author_insert on public.blogs for insert to authenticated with check (core.can(organization_id, 'cms.post.create') and created_by = auth.uid() and status in ('draft','review'));
create policy blogs_author_update on public.blogs for update to authenticated using (created_by = auth.uid() and status in ('draft','review') and core.can(organization_id, 'cms.post.create')) with check (created_by = auth.uid() and status in ('draft','review'));
create policy news_author_read on public.news for select to authenticated using (created_by = auth.uid() or core.can(organization_id, 'cms.post.review'));
create policy news_author_insert on public.news for insert to authenticated with check (core.can(organization_id, 'cms.post.create') and created_by = auth.uid() and status in ('draft','review'));
create policy news_author_update on public.news for update to authenticated using (created_by = auth.uid() and status in ('draft','review') and core.can(organization_id, 'cms.post.create')) with check (created_by = auth.uid() and status in ('draft','review'));

-- ---------- workflow RPCs ----------
-- submit for review (author) / decide (reviewer: changes | publish)
create or replace function public.k1_post_submit(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid; owner uuid; st text;
begin
  if p_kind = 'blog' then select organization_id, created_by, status::text into org, owner, st from public.blogs where id = p_id;
  else select organization_id, created_by, status::text into org, owner, st from public.news where id = p_id; end if;
  if org is null then raise exception 'Post not found'; end if;
  if not (owner = auth.uid() and core.can(org, 'cms.post.create')) and not core.can(org, 'cms.post.publish') then raise exception 'Not allowed'; end if;
  if st not in ('draft','review') then raise exception 'Only drafts can be submitted'; end if;
  if p_kind = 'blog' then update public.blogs set status = 'review', submitted_at = now(), review_note = null where id = p_id;
  else update public.news set status = 'review', submitted_at = now(), review_note = null where id = p_id; end if;
end $$;
grant execute on function public.k1_post_submit(text, uuid) to authenticated;

create or replace function public.k1_post_decide(p_kind text, p_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  if p_kind = 'blog' then select organization_id into org from public.blogs where id = p_id; else select organization_id into org from public.news where id = p_id; end if;
  if org is null then raise exception 'Post not found'; end if;
  if p_decision = 'publish' then
    if not core.can(org, 'cms.post.publish') then raise exception 'Only a publisher can publish'; end if;
    if p_kind = 'blog' then update public.blogs set status = 'published', published_at = coalesce(published_at, now()), reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note where id = p_id;
    else update public.news set status = 'published', published_at = coalesce(published_at, now()), reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note where id = p_id; end if;
  elsif p_decision = 'changes' then
    if not (core.can(org, 'cms.post.review') or core.can(org, 'cms.post.publish')) then raise exception 'Not allowed'; end if;
    if coalesce(trim(p_note), '') = '' then raise exception 'Tell the author what to change'; end if;
    if p_kind = 'blog' then update public.blogs set status = 'draft', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note where id = p_id;
    else update public.news set status = 'draft', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note where id = p_id; end if;
  elsif p_decision = 'unpublish' then
    if not core.can(org, 'cms.post.publish') then raise exception 'Not allowed'; end if;
    if p_kind = 'blog' then update public.blogs set status = 'archived' where id = p_id; else update public.news set status = 'archived' where id = p_id; end if;
  else raise exception 'Unknown decision'; end if;
end $$;
grant execute on function public.k1_post_decide(text, uuid, text, text) to authenticated;

-- central feed: an organization nominates a published post; an admin of any ancestor organization approves
create or replace function public.k1_post_nominate(p_kind text, p_id uuid, p_nominate boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid; st text;
begin
  if p_kind = 'blog' then select organization_id, status::text into org, st from public.blogs where id = p_id; else select organization_id, status::text into org, st from public.news where id = p_id; end if;
  if org is null then raise exception 'Post not found'; end if;
  if not core.can(org, 'cms.post.nominate_central') and not core.can(org, 'cms.post.publish') then raise exception 'Not allowed'; end if;
  if p_nominate and st <> 'published' then raise exception 'Publish the post first'; end if;
  if p_kind = 'blog' then update public.blogs set central_status = case when p_nominate then 'nominated' else 'none' end where id = p_id;
  else update public.news set central_status = case when p_nominate then 'nominated' else 'none' end where id = p_id; end if;
end $$;
grant execute on function public.k1_post_nominate(text, uuid, boolean) to authenticated;

create or replace function public.k1_central_decide(p_kind text, p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid; ok boolean;
begin
  if p_kind = 'blog' then select organization_id into org from public.blogs where id = p_id; else select organization_id into org from public.news where id = p_id; end if;
  if org is null then raise exception 'Post not found'; end if;
  select exists (select 1 from core.org_tree t where t.descendant_id = org and t.depth > 0 and core.can(t.ancestor_id, 'cms.post.publish')) into ok;
  if not ok and not core.is_platform_admin() then raise exception 'Only a parent organization publisher can decide'; end if;
  if p_kind = 'blog' then update public.blogs set central_status = case when p_approve then 'approved' else 'declined' end where id = p_id;
  else update public.news set central_status = case when p_approve then 'approved' else 'declined' end where id = p_id; end if;
end $$;
grant execute on function public.k1_central_decide(text, uuid, boolean) to authenticated;

-- feed for an organization: approved central posts of all descendant organizations (+ its own published posts)
create or replace function public.k1_central_feed(p_org uuid, p_limit int default 40, p_status text default 'approved')
returns table (kind text, id uuid, organization_id uuid, org_name text, org_slug text, title text, slug text, excerpt text, image text, published_at timestamptz, central_status text)
language sql stable security definer set search_path = '' as $$
  select * from (
    select 'blog'::text, b.id, b.organization_id, o.name, o.slug, b.title, b.slug, b.excerpt, b.featured_image, b.published_at, b.central_status
      from public.blogs b join core.org_tree t on t.descendant_id = b.organization_id and t.ancestor_id = p_org
      join core.organizations o on o.id = b.organization_id
     where b.status = 'published' and ((t.depth > 0 and b.central_status = p_status) or (t.depth = 0 and p_status = 'approved'))
    union all
    select 'news', n.id, n.organization_id, o.name, o.slug, n.title, n.slug, n.description, n.thumbnail, n.published_at, n.central_status
      from public.news n join core.org_tree t on t.descendant_id = n.organization_id and t.ancestor_id = p_org
      join core.organizations o on o.id = n.organization_id
     where n.status = 'published' and ((t.depth > 0 and n.central_status = p_status) or (t.depth = 0 and p_status = 'approved'))
  ) x order by published_at desc nulls last limit p_limit;
$$;
grant execute on function public.k1_central_feed(uuid, int, text) to anon, authenticated;

-- view counter (public)
create or replace function public.k1_post_view(p_kind text, p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.blogs set views = views + 1 where p_kind = 'blog' and id = p_id and status = 'published';
  update public.news set views = views + 1 where p_kind = 'news' and id = p_id and status = 'published';
$$;
grant execute on function public.k1_post_view(text, uuid) to anon, authenticated;

-- ---------- comments (moderated) ----------
create table public.cms_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  post_kind text not null check (post_kind in ('blog','news')),
  post_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  body text not null check (length(body) between 2 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','spam')),
  created_at timestamptz not null default now()
);
create index on public.cms_comments(post_kind, post_id, status);
alter table public.cms_comments enable row level security;
create policy cms_comments_public_read on public.cms_comments for select using (status = 'approved');
create policy cms_comments_insert on public.cms_comments for insert with check (true);
create policy cms_comments_moderate on public.cms_comments for all to authenticated
  using (core.can(organization_id, 'cms.post.review') or core.can(organization_id, 'cms.post.publish'))
  with check (core.can(organization_id, 'cms.post.review') or core.can(organization_id, 'cms.post.publish'));
grant select, insert on public.cms_comments to anon, authenticated;
grant update, delete on public.cms_comments to authenticated;

-- ---------- magazine / publications ----------
create table public.pub_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  title text not null, title_hi text,
  slug text not null,
  issue_no text,
  issue_date date not null default current_date,
  description text,
  cover_path text,                       -- storage: publications/<org>/<issue>/cover.jpg
  pdf_path text,                         -- storage: publications/<org>/<issue>/issue.pdf
  pages jsonb not null default '[]'::jsonb,   -- [storage paths of page images] for the flipbook
  access text not null default 'public' check (access in ('public','members')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  views int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index on public.pub_issues(organization_id, issue_date desc);
create trigger trg_pub_issues_updated before update on public.pub_issues for each row execute function public.set_updated_at();
alter table public.pub_issues enable row level security;
create policy pub_issues_public_read on public.pub_issues for select using (status = 'published' and access = 'public');
create policy pub_issues_members_read on public.pub_issues for select to authenticated
  using (status = 'published' and (access = 'public' or core.is_org_team(organization_id) or exists (select 1 from public.org_memberships m where m.organization_id = pub_issues.organization_id and m.user_id = auth.uid() and m.status = 'active')));
create policy pub_issues_write on public.pub_issues for all to authenticated
  using (core.can(organization_id, 'cms.post.publish')) with check (core.can(organization_id, 'cms.post.publish'));
grant select on public.pub_issues to anon, authenticated;
grant insert, update, delete on public.pub_issues to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('publications', 'publications', true, 52428800, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy publications_public_read on storage.objects for select using (bucket_id = 'publications');
create policy publications_write on storage.objects for insert to authenticated
  with check (bucket_id = 'publications' and core.can((split_part(name, '/', 1))::uuid, 'cms.post.publish'));
create policy publications_update on storage.objects for update to authenticated
  using (bucket_id = 'publications' and core.can((split_part(name, '/', 1))::uuid, 'cms.post.publish'));
create policy publications_delete on storage.objects for delete to authenticated
  using (bucket_id = 'publications' and core.can((split_part(name, '/', 1))::uuid, 'cms.post.publish'));

create or replace function public.k1_issue_view(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.pub_issues set views = views + 1 where id = p_id and status = 'published';
$$;
grant execute on function public.k1_issue_view(uuid) to anon, authenticated;
