-- Kalchuri One · core tenancy RLS tests. Send as ONE query string (one implicit transaction); it removes
-- its own test rows at the end, and any failure rolls everything back.
-- Uses two existing non-platform users: A (made org_admin of a temp org B) and Q (made secretary of B).
-- Output: one row per check, ok = true means pass.
create temp table t_result(name text, ok boolean) ;
grant all on t_result to authenticated, anon;
create temp table t_ctx(k text primary key, v uuid) ;
grant all on t_ctx to authenticated, anon;

insert into t_ctx select 'A', id from public.profiles p where not super_admin and not exists (select 1 from core.platform_admins x where x.user_id = p.id) order by created_at limit 1;
insert into t_ctx select 'Q', id from public.profiles p where not super_admin and id <> (select v from t_ctx where k='A') order by created_at limit 1;
insert into t_ctx select 'P', user_id from core.platform_admins limit 1;
insert into t_ctx select 'ROOT', id from core.organizations where slug = 'kalchuri-samaj';
insert into t_ctx select 'EKYM', id from core.organizations where slug = 'ekym';
insert into core.organizations(slug, name, kind, level, parent_id, status)
  select 'test-org-b', 'Test Org B', 'association', 'district', v, 'active' from t_ctx where k = 'ROOT';
insert into t_ctx select 'B', id from core.organizations where slug = 'test-org-b';
insert into core.role_assignments(organization_id, user_id, role_id)
  select (select v from t_ctx where k='B'), (select v from t_ctx where k='A'), id from core.roles where organization_id is null and key='org_admin';
insert into core.role_assignments(organization_id, user_id, role_id)
  select (select v from t_ctx where k='B'), (select v from t_ctx where k='Q'), id from core.roles where organization_id is null and key='secretary';

insert into t_result select 'tree: B is depth 1 under ROOT',
  exists (select 1 from core.org_tree where ancestor_id = (select v from t_ctx where k='ROOT') and descendant_id = (select v from t_ctx where k='B') and depth = 1);

-- ===== as A (org_admin of B only) =====
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select v from t_ctx where k='A'), 'role','authenticated')::text, true);

insert into t_result select 'A can edit B', core.can((select v from t_ctx where k='B'), 'cms.page.edit');
insert into t_result select 'A cannot edit EKYM', not core.can((select v from t_ctx where k='EKYM'), 'cms.page.edit');
insert into t_result select 'A is not platform admin', not core.is_platform_admin();

with u as (update core.organizations set name = 'hacked' where slug = 'ekym' returning 1)
insert into t_result select 'A update on EKYM affects 0 rows', (select count(*) from u) = 0;

do $$ begin
  insert into core.role_assignments(organization_id, user_id, role_id)
  select (select v from t_ctx where k='EKYM'), (select v from t_ctx where k='A'), id from core.roles where organization_id is null and key='org_admin';
  insert into t_result values ('A cannot make himself admin of EKYM', false);
exception when others then insert into t_result values ('A cannot make himself admin of EKYM', true);
end $$;

do $$ begin
  insert into core.platform_admins(user_id) select v from t_ctx where k='A';
  insert into t_result values ('A cannot become platform admin', false);
exception when others then insert into t_result values ('A cannot become platform admin', true);
end $$;

insert into t_result select 'A cannot read EKYM team list',
  not exists (select 1 from core.role_assignments where organization_id = (select v from t_ctx where k='EKYM'));

insert into core.organizations(slug, name, kind, level, status) values ('test-new-by-a', 'New By A', 'committee', 'city', 'active');
insert into t_result select 'new org by A is forced to pending', (select status::text from core.organizations where slug='test-new-by-a') = 'pending';
insert into t_result select 'A became admin of his new org', core.can((select id from core.organizations where slug='test-new-by-a'), 'org.settings.edit');

do $$ begin
  update core.organizations set status = 'active' where slug = 'test-new-by-a';
  insert into t_result values ('A cannot self-approve his org', false);
exception when others then insert into t_result values ('A cannot self-approve his org', true);
end $$;

do $$ begin
  update core.organizations set parent_id = (select v from t_ctx where k='EKYM') where slug = 'test-new-by-a';
  insert into t_result values ('A cannot place his org under EKYM', false);
exception when others then insert into t_result values ('A cannot place his org under EKYM', true);
end $$;

-- ===== as Q (secretary of B, no role management) =====
select set_config('request.jwt.claims', json_build_object('sub', (select v from t_ctx where k='Q'), 'role','authenticated')::text, true);
insert into t_result select 'Q (secretary) can approve members in B', core.can((select v from t_ctx where k='B'), 'org.member.approve');
insert into t_result select 'Q cannot edit B settings', not core.can((select v from t_ctx where k='B'), 'org.settings.edit');
do $$ begin
  insert into core.role_assignments(organization_id, user_id, role_id)
  select (select v from t_ctx where k='B'), (select v from t_ctx where k='Q'), id from core.roles where organization_id is null and key='org_admin';
  insert into t_result values ('Q cannot promote himself', false);
exception when others then insert into t_result values ('Q cannot promote himself', true);
end $$;

-- ===== as anon =====
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into t_result select 'anon sees no pending orgs', not exists (select 1 from core.organizations where status <> 'active');
do $$ begin
  perform 1 from core.org_domains limit 1;
  insert into t_result values ('anon cannot read domains', not found);
exception when insufficient_privilege then insert into t_result values ('anon cannot read domains', true);
end $$;

-- ===== as platform admin =====
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select v from t_ctx where k='P'), 'role','authenticated')::text, true);
insert into t_result select 'platform admin can edit any org', core.can((select v from t_ctx where k='EKYM'), 'fin.fy.lock');
do $$ begin
  update core.organizations set parent_id = (select v from t_ctx where k='B') where slug = 'kalchuri-samaj';
  insert into t_result values ('cycle (root under its child) is blocked', false);
exception when others then insert into t_result values ('cycle (root under its child) is blocked', true);
end $$;
update core.organizations set parent_id = (select v from t_ctx where k='EKYM') where slug = 'test-org-b';
insert into t_result select 'move B under EKYM rebuilds tree (depth 2 from ROOT)',
  exists (select 1 from core.org_tree where ancestor_id = (select v from t_ctx where k='ROOT') and descendant_id = (select v from t_ctx where k='B') and depth = 2);

reset role;
insert into t_result select 'audit log recorded changes', exists (select 1 from core.audit_log where table_name = 'organizations' and row_id = (select v from t_ctx where k='B')::text and action = 'update');

-- cleanup (as owner)
delete from core.organizations where slug in ('test-org-b','test-new-by-a');
delete from core.audit_log a where a.organization_id is not null
   and not exists (select 1 from core.organizations o where o.id = a.organization_id);
drop table t_ctx;

select name, ok from t_result;
