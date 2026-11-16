-- समुदाय प्रोफ़ाइल का पूरा परिचय: खंडवार जानकारी (मूल, कार्य व शिक्षा, स्थान, परिवार, समाज सेवा व उपलब्धियाँ, और लिंक)
alter table public.cm_user_profiles add column if not exists about jsonb not null default '{}'::jsonb;
do $$ begin
  alter table public.cm_user_profiles add constraint cm_user_profiles_about_chk check (jsonb_typeof(about) = 'object' and length(about::text) <= 8000);
exception when duplicate_object then null; end $$;

-- सिर्फ़ तय कुंजियाँ, साफ़ किया हुआ पाठ; show_family = परिवार वाली जानकारी दूसरों को दिखे या नहीं
create or replace function public.k1_profile_save_about(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare keys text[] := array['gender','blood_group','marital_status','languages','company','designation','work_place','education','college','skills',
                              'hometown','gotra','father_name','spouse_name','children','social_work','achievements','linkedin','twitter','whatsapp_channel'];
        long text[] := array['skills','social_work','achievements'];
        clean jsonb;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select coalesce(jsonb_object_agg(k, left(btrim(p->>k), case when k = any(long) then 1000 else 200 end)), '{}'::jsonb)
    into clean from unnest(keys) k where nullif(btrim(p->>k), '') is not null;
  clean := clean || jsonb_build_object('show_family', coalesce((p->>'show_family')::boolean, true));
  insert into public.cm_user_profiles as cp (user_id, about, updated_at) values (auth.uid(), clean, now())
  on conflict (user_id) do update set about = excluded.about, updated_at = now();
end $$;
revoke all on function public.k1_profile_save_about(jsonb) from public, anon;
grant execute on function public.k1_profile_save_about(jsonb) to authenticated;

-- k1_profile लौटाए 'about' (परिवार वाले खाने छिपे, अगर सदस्य ने मना किया हो)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.k1_profile(uuid)'::regprocedure);
  if position('''about''' in d) = 0 then
    d := replace(d, '''bio'', p.bio,', '''bio'', p.bio, ''about'', case when me or coalesce((p.about->>''show_family'')::boolean, true) then coalesce(p.about, ''{}''::jsonb) else coalesce(p.about, ''{}''::jsonb) - array[''father_name'',''spouse_name'',''children''] end,');
    if position('''about''' in d) = 0 then raise exception 'k1_profile patch failed'; end if;
    execute d;
  end if;
end $$;
