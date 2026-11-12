-- Kalchuri One community (owner, 2026-11-12): explicit user consent before first use of community features (chat, profile,
-- stories, friends, posting) — records when and which version of the community terms was accepted. Applied via MCP.
alter table public.cm_user_profiles add column if not exists terms_accepted_at timestamptz, add column if not exists terms_version text;
create or replace function public.k1_accept_terms(p_version text default 'community-2026-11')
returns timestamptz language sql security definer set search_path = '' as $$
  insert into public.cm_user_profiles (user_id, terms_accepted_at, terms_version) values (auth.uid(), now(), p_version)
  on conflict (user_id) do update set terms_accepted_at = now(), terms_version = excluded.terms_version
  returning terms_accepted_at;
$$;
grant execute on function public.k1_accept_terms(text) to authenticated;
create or replace function public.k1_terms_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('accepted_at', cp.terms_accepted_at, 'version', cp.terms_version) from (select 1) x left join public.cm_user_profiles cp on cp.user_id = auth.uid();
$$;
grant execute on function public.k1_terms_status() to authenticated;
