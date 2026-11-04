-- Kalchuri One · Phase 13 (hardening) · function grants.
-- Supabase's default privileges give EXECUTE on every new function to PUBLIC, anon, authenticated and service_role,
-- so the security advisor listed ~100 SECURITY DEFINER functions callable by anon. Every function checks permissions
-- inside, but anonymous visitors have no business calling admin / finance / moderation RPCs at all.
-- Rule from now on: anon may call only the functions public pages need (allow-list below); authenticated keeps
-- everything except server-internal helpers; service_role keeps everything. Future functions must grant anon explicitly.

do $$
declare
  r record;
  anon_ok text[] := array['k1_ad_board','k1_ad_hit','k1_ads_for','k1_central_feed','k1_event_register','k1_feed','k1_issue_view','k1_listing_view','k1_org_by_slug','k1_poll_results','k1_post_comments','k1_post_shared','k1_post_view','k1_resolve_host','k1_rsvp','k1_rsvp_info','k1_verify_document'];
  internal text[] := array['cm_moderate_tick','comms_tick','send_letters_tick','send_admin_digest','k1_cm_pending_posts','k1_cm_moderation_result','k1_cm_notify_moderators','k1_comms_claim','k1_comms_result','k1_comms_status_update','k1_comms_opt_out','k1_comms_channel_runtime','fin_ensure_series','fin_ensure_year','fin_year_for'];
begin
  for r in
    select p.proname, p.oid::regprocedure::text sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
    if r.proname = any(internal) then execute format('revoke execute on function %s from authenticated', r.sig);
    else execute format('grant execute on function %s to authenticated', r.sig); end if;
    if r.proname = any(anon_ok) then execute format('grant execute on function %s to anon', r.sig); end if;
  end loop;
end $$;

-- new functions created by migrations (role postgres) no longer get anon / PUBLIC execute by default
alter default privileges for role postgres in schema public revoke execute on functions from anon, public;

-- fixed search_path on the three helpers the advisor flagged
alter function public.k1_norm_contact(text) set search_path = '';
alter function public.fin_fy_label(date) set search_path = '';
alter function public.k1_cm_default_keywords() set search_path = '';

-- trigger functions are never called through the API; firing a trigger needs no EXECUTE privilege (verified with a
-- throwaway trigger under `set role anon`), so they are locked down fully.
do $$
declare r record;
begin
  for r in select p.oid::regprocedure::text sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;
