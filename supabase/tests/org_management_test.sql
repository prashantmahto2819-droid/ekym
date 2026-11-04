-- Phase 3 isolation checks (send as ONE query; self-cleaning). All checks must return ok = true.
create temp table t_result(name text, ok boolean); grant all on t_result to authenticated, anon;
create temp table t_ctx(k text primary key, v uuid); grant all on t_ctx to authenticated, anon;
insert into t_ctx select 'A', id from public.profiles p where not super_admin and not exists (select 1 from core.platform_admins x where x.user_id=p.id) order by created_at limit 1;
insert into t_ctx select 'EKYM', id from core.organizations where slug='ekym';
insert into core.organizations(slug,name,kind,level,status) values ('test-org-c','Test C','association','district','active');
insert into t_ctx select 'C', id from core.organizations where slug='test-org-c';
insert into core.role_assignments(organization_id,user_id,role_id) select (select v from t_ctx where k='C'),(select v from t_ctx where k='A'),id from core.roles where organization_id is null and key='secretary';
insert into public.gov_committees(organization_id,name) select v,'EKYM Executive' from t_ctx where k='EKYM';
insert into public.gov_announcements(organization_id,title,body,audience) select v,'Team only','secret','team' from t_ctx where k='EKYM';

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
insert into public.org_memberships(organization_id,full_name,mobile,consent,status,member_no) select v,'Applicant One','9876543210',true,'active','HACK-1' from t_ctx where k='C';
insert into t_result select 'anon sees public committees only', exists (select 1 from public.gov_committees where name='EKYM Executive');
insert into t_result select 'anon cannot see team announcements', not exists (select 1 from public.gov_announcements where title='Team only');
reset role;
insert into t_result select 'anon application forced to applied, no member_no, phone normalised', exists (select 1 from public.org_memberships where full_name='Applicant One' and status='applied' and member_no is null and mobile='919876543210');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',(select v from t_ctx where k='A'),'role','authenticated')::text, true);
insert into t_result select 'secretary of C sees C application', exists (select 1 from public.org_memberships where full_name='Applicant One');
insert into t_result select 'secretary of C cannot see EKYM team announcement', not exists (select 1 from public.gov_announcements where title='Team only');
do $$ begin
  insert into public.gov_meetings(organization_id,title,scheduled_at) select v,'intrusion',now() from t_ctx where k='EKYM';
  insert into t_result values ('secretary of C cannot create EKYM meeting', false);
exception when others then insert into t_result values ('secretary of C cannot create EKYM meeting', true); end $$;
insert into public.gov_meetings(organization_id,title,scheduled_at) select v,'C meeting',now()+interval '1 day' from t_ctx where k='C';
insert into t_result select 'secretary of C can create C meeting', exists (select 1 from public.gov_meetings where title='C meeting');
insert into public.gov_resolutions(organization_id,title,text) select v,'Res 1','We resolve.' from t_ctx where k='C';
insert into t_result select 'resolution auto-numbered', (select number from public.gov_resolutions where title='Res 1') like '%/R/0001';
select public.k1_decide_membership((select id from public.org_memberships where full_name='Applicant One'), true, 'life', null);
insert into t_result select 'approval assigns member number', (select member_no from public.org_memberships where full_name='Applicant One') like '%/M/0001';
do $$ begin
  perform public.k1_decide_membership((select id from public.org_memberships where full_name='Applicant One'), false, null, null);
  insert into t_result values ('second decision blocked', false);
exception when others then insert into t_result values ('second decision blocked', true); end $$;
do $$ begin
  insert into public.gov_committees(organization_id,name) select v,'C committee' from t_ctx where k='C';
  insert into t_result values ('secretary cannot create committee (needs org.settings.edit)', false);
exception when others then insert into t_result values ('secretary cannot create committee (needs org.settings.edit)', true); end $$;
reset role;
delete from core.organizations where slug='test-org-c';
delete from public.gov_committees where name='EKYM Executive';
delete from public.gov_announcements where title='Team only';
delete from core.audit_log a where a.organization_id is not null and not exists (select 1 from core.organizations o where o.id=a.organization_id);
drop table t_ctx;
select * from t_result;
