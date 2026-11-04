-- Kalchuri One · Phase 13 · operations: health check, abuse rate limits, per-organization data export, daily ops digest.

-- ---------- rate limits (abuse guard; generous for normal use) ----------
create or replace function public.k1_rate_guard(p_table text, p_col text, p_who uuid, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if p_who is null then return; end if;
  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - $2', p_table, p_col) into n using p_who, p_window;
  if n >= p_max then raise exception 'Too many submissions — please wait a while (limit % per %)', p_max, p_window using errcode = 'P0001'; end if;
end $$;
create or replace function public.trg_rate_cm_posts() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.k1_rate_guard('cm_posts', 'author_id', new.author_id, 20, interval '1 hour'); return new; end $$;
create or replace function public.trg_rate_cm_comments() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.k1_rate_guard('cm_post_comments', 'author_id', new.author_id, 60, interval '1 hour'); return new; end $$;
create or replace function public.trg_rate_cm_listings() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.k1_rate_guard('cm_listings', 'submitted_by', new.submitted_by, 10, interval '1 day'); return new; end $$;
create or replace function public.trg_rate_cm_reports() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.k1_rate_guard('cm_post_reports', 'reporter_id', new.reporter_id, 30, interval '1 day'); return new; end $$;
create trigger trg_rate_cm_posts before insert on public.cm_posts for each row execute function public.trg_rate_cm_posts();
create trigger trg_rate_cm_comments before insert on public.cm_post_comments for each row execute function public.trg_rate_cm_comments();
create trigger trg_rate_cm_listings before insert on public.cm_listings for each row execute function public.trg_rate_cm_listings();
create trigger trg_rate_cm_reports before insert on public.cm_post_reports for each row execute function public.trg_rate_cm_reports();
revoke execute on function public.k1_rate_guard(text, text, uuid, int, interval) from public, anon, authenticated;

-- ---------- health (platform admin) ----------
create or replace function public.k1_health()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare res jsonb; problems text[] := '{}'; v int; t timestamptz;
begin
  if not core.is_platform_admin() then raise exception 'Platform admin only'; end if;
  res := jsonb_build_object(
    'checked_at', now(),
    'db_size_mb', round(pg_database_size(current_database()) / 1048576.0),
    'comms', jsonb_build_object(
      'queued', (select count(*) from public.comms_messages where status = 'queued'),
      'sending', (select count(*) from public.comms_messages where status = 'sending'),
      'oldest_queued_min', (select coalesce(extract(epoch from now() - min(next_attempt_at)) / 60, 0)::int from public.comms_messages where status = 'queued'),
      'failed_24h', (select count(*) from public.comms_messages where status = 'failed' and created_at > now() - interval '24 hours'),
      'sent_24h', (select count(*) from public.comms_messages where sent_at > now() - interval '24 hours'),
      'channels_active', (select count(*) from public.comms_channels where status = 'active')),
    'shok', jsonb_build_object(
      'letters_queued', (select count(*) from public.letters where status in ('queued','sending')),
      'recipients_pending', (select count(*) from public.letter_recipients r join public.letters l on l.id = r.letter_id where l.status in ('queued','sending') and r.status in ('queued','sending')),
      'failed_24h', (select count(*) from public.letter_recipients where status = 'failed' and sent_at is null and attempts > 0 and letter_id in (select id from public.letters where created_at > now() - interval '24 hours')),
      'last_error', (select last_error from public.letters where last_error is not null order by created_at desc limit 1)),
    'moderation', jsonb_build_object(
      'pending', (select count(*) from public.cm_posts where moderation_status = 'pending'),
      'oldest_pending_min', (select coalesce(extract(epoch from now() - min(created_at)) / 60, 0)::int from public.cm_posts where moderation_status = 'pending'),
      'flagged_open', (select count(*) from public.cm_posts where status = 'active' and reach = 'limited'),
      'reports_open', (select count(*) from public.cm_post_reports where status = 'open')),
    'approvals', jsonb_build_object(
      'memberships', (select count(*) from public.org_memberships where status = 'applied'),
      'listings', (select count(*) from public.cm_listings where status = 'pending'),
      'documents', (select count(*) from public.docs_documents where status = 'pending_approval'),
      'domains', (select count(*) from core.org_domains where kind = 'custom' and verified_at is null)),
    'cron', (select coalesce(jsonb_agg(jsonb_build_object('job', j.jobname, 'schedule', j.schedule, 'active', j.active, 'last_status', d.status, 'last_run', d.start_time, 'last_msg', left(d.return_message, 120)) order by j.jobname), '[]'::jsonb)
               from cron.job j left join lateral (select status, start_time, return_message from cron.job_run_details r where r.jobid = j.jobid order by start_time desc limit 1) d on true),
    'counts', jsonb_build_object(
      'organizations', (select count(*) from core.organizations),
      'users', (select count(*) from auth.users),
      'members', (select count(*) from public.org_memberships where status = 'active'),
      'families', (select count(*) from public.families where status <> 'deleted'),
      'posts_7d', (select count(*) from public.cm_posts where created_at > now() - interval '7 days'),
      'donations_30d', (select coalesce(sum(amount), 0) from public.donations where status = 'PAID' and created_at > now() - interval '30 days')));
  -- problems
  v := (res->'comms'->>'oldest_queued_min')::int; if v > 30 then problems := array_append(problems, 'WhatsApp/email queue stuck for ' || v || ' min'); end if;
  v := (res->'comms'->>'failed_24h')::int; if v > 0 then problems := array_append(problems, v || ' messages failed in 24 h'); end if;
  v := (res->'moderation'->>'oldest_pending_min')::int; if v > 30 then problems := array_append(problems, 'Post moderation pending for ' || v || ' min (cm-moderate not running?)'); end if;
  if res->'shok'->>'last_error' is not null then problems := array_append(problems, 'Shok sandesh: ' || (res->'shok'->>'last_error')); end if;
  for t in select d.start_time from cron.job j join lateral (select status, start_time from cron.job_run_details r where r.jobid = j.jobid order by start_time desc limit 1) d on true where d.status = 'failed' loop
    problems := array_append(problems, 'A cron job failed at ' || to_char(t, 'DD Mon HH24:MI'));
  end loop;
  if (select count(*) from cron.job where active) = 0 then problems := array_append(problems, 'No active cron jobs'); end if;
  return res || jsonb_build_object('problems', to_jsonb(problems), 'ok', cardinality(problems) = 0);
end $$;
revoke execute on function public.k1_health() from public, anon;
grant execute on function public.k1_health() to authenticated, service_role;

-- public liveness probe for an uptime monitor: no data, just "db answers"
create or replace function public.k1_ping()
returns jsonb language sql stable security definer set search_path = '' as $$ select jsonb_build_object('ok', true, 'at', now()); $$;
grant execute on function public.k1_ping() to anon, authenticated;

-- ---------- daily ops digest (08:00 IST) to platform admins' WhatsApp when something is wrong ----------
create or replace function public.send_health_digest()
returns void language plpgsql security definer set search_path = '' as $$
declare h jsonb; org uuid; ch uuid; r record; msg text; saved uuid;
begin
  -- run as platform admin: temporarily impersonate the first platform admin for k1_health's check
  select user_id into saved from core.platform_admins order by created_at limit 1;
  if saved is null then return; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', saved, 'role', 'authenticated')::text, true);
  h := public.k1_health();
  if (h->>'ok')::boolean then return; end if;
  select c.organization_id, c.id into org, ch from public.comms_channels c where c.kind = 'whatsapp' and c.status = 'active' order by c.is_default desc, c.created_at limit 1;
  if ch is null then return; end if;
  msg := '🩺 Kalchuri One — daily health check' || E'\n' || array_to_string(array(select '• ' || x from jsonb_array_elements_text(h->'problems') x), E'\n')
      || E'\n\n' || 'Queue: ' || (h->'comms'->>'queued') || ' | failed 24h: ' || (h->'comms'->>'failed_24h') || ' | moderation pending: ' || (h->'moderation'->>'pending')
      || E'\n' || 'Admin → System health';
  for r in select distinct coalesce(sp.mobile, pr.phone) phone, coalesce(sp.full_name, pr.full_name) name
             from core.platform_admins pa left join public.site_profiles sp on sp.id = pa.user_id left join public.profiles pr on pr.id = pa.user_id
  loop
    if r.phone is not null and public.k1_norm_contact(r.phone) ~ '^[0-9]{11,13}$' then
      insert into public.comms_messages(organization_id, channel_id, kind, purpose, to_contact, to_name, body, ref_table)
      values (org, ch, 'whatsapp', 'utility', public.k1_norm_contact(r.phone), r.name, msg, 'health');
    end if;
  end loop;
end $$;
revoke execute on function public.send_health_digest() from public, anon, authenticated;
select cron.schedule('kalchuri-health-digest', '30 2 * * *', 'select public.send_health_digest()');

-- ---------- per-organization data export (JSON) ----------
create or replace function public.k1_org_export(p_org uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; out jsonb := '{}'::jsonb; part jsonb;
  skip text[] := array['comms_channels','payment_settings','payment_webhook_events','payment_transactions','cms_page_revisions','ad_stats','comms_messages','media_library'];
begin
  if not (core.can(p_org, 'org.settings.edit') or core.is_platform_admin()) then raise exception 'Not allowed'; end if;
  for r in select c.table_name from information_schema.columns c where c.table_schema = 'public' and c.column_name = 'organization_id' and c.table_name <> all(skip) order by 1 loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from (select * from public.%I where organization_id = $1 limit 50000) t', r.table_name) into part using p_org;
    if jsonb_array_length(part) > 0 then out := out || jsonb_build_object(r.table_name, part); end if;
  end loop;
  out := out || jsonb_build_object('organization', (select to_jsonb(o) - 'settings' from core.organizations o where o.id = p_org), 'exported_at', now(), 'exported_by', auth.uid());
  insert into core.audit_log(organization_id, actor_id, table_schema, table_name, row_id, action, new_data) values (p_org, auth.uid(), 'core', 'organizations', p_org::text, 'export', jsonb_build_object('tables', (select jsonb_agg(k) from jsonb_object_keys(out) k)));
  return out;
end $$;
revoke execute on function public.k1_org_export(uuid) from public, anon;
grant execute on function public.k1_org_export(uuid) to authenticated;
