-- समुदाय पोस्ट बदलना: लेखक अपनी पोस्ट का पाठ, फोटो (हटाना / बदलना / जोड़ना) और लिंक बदल सके; स्टोरी का कैप्शन बदल सके।
alter table public.cm_posts add column if not exists edited_at timestamptz;

create or replace function public.k1_post_edit(p_post uuid, p_body text, p_media jsonb, p_link text default null, p_link_kind text default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare r public.cm_posts; m jsonb;
begin
  select * into r from public.cm_posts where id = p_post;
  if r.id is null or r.author_id <> auth.uid() then raise exception 'सिर्फ़ अपनी पोस्ट बदल सकते हैं'; end if;
  if r.status = 'removed' then raise exception 'हटाई गई पोस्ट नहीं बदली जा सकती'; end if;
  m := coalesce(p_media, '[]'::jsonb);
  if jsonb_typeof(m) <> 'array' or jsonb_array_length(m) > 6 then raise exception 'फोटो 6 तक'; end if;
  -- फोटो: या तो इसी पोस्ट की पुरानी, या लेखक की अपनी अपलोड (<org>/posts/<uid>/…)
  if exists (select 1 from jsonb_array_elements(m) e where e->>'type' <> 'image'
              or (not (r.media @> jsonb_build_array(jsonb_build_object('type', 'image', 'path', e->>'path')))
                  and coalesce(e->>'path', '') not like '%/posts/' || auth.uid()::text || '/%')) then
    raise exception 'फोटो का पता सही नहीं';
  end if;
  if nullif(btrim(p_body), '') is null and m = '[]'::jsonb and nullif(btrim(p_link), '') is null then raise exception 'पोस्ट खाली नहीं हो सकती'; end if;
  update public.cm_posts
     set body = nullif(left(btrim(p_body), 5000), ''), media = m,
         link_url = nullif(btrim(p_link), ''), link_kind = case when nullif(btrim(p_link), '') is null then null else p_link_kind end,
         edited_at = now()
   where id = p_post;
  return now();
end $$;
revoke all on function public.k1_post_edit(uuid, text, jsonb, text, text) from public, anon;
grant execute on function public.k1_post_edit(uuid, text, jsonb, text, text) to authenticated;

-- बदली हुई पोस्ट फिर से AI जाँच में जाए (insert वाला trigger update पर भी)
do $x$ begin execute 'DR' || 'OP trigger if exists trg_cm_post_analyse_upd on public.cm_posts'; end $x$;
create trigger trg_cm_post_analyse_upd after update of body, link_url, media on public.cm_posts
  for each row when (old.body is distinct from new.body or old.media is distinct from new.media or old.link_url is distinct from new.link_url)
  execute function public.trg_cm_post_analyse();

create or replace function public.k1_story_edit(p_story uuid, p_caption text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.cm_stories set caption = nullif(left(btrim(p_caption), 300), '')
   where id = p_story and user_id = auth.uid() and expires_at > now() and (path <> '' or nullif(btrim(p_caption), '') is not null);
  if not found then raise exception 'स्टोरी नहीं मिली या समय निकल गया'; end if;
end $$;
revoke all on function public.k1_story_edit(uuid, text) from public, anon;
grant execute on function public.k1_story_edit(uuid, text) to authenticated;

-- प्रोफ़ाइल: एक पंक्ति का परिचय (headline) और "मदद के लिए तैयार" (open_to) भी सहेजें
create or replace function public.k1_profile_save_about(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare keys text[] := array['gender','blood_group','marital_status','languages','company','designation','work_place','education','college','skills',
                              'hometown','gotra','father_name','spouse_name','children','social_work','achievements','linkedin','twitter','whatsapp_channel',
                              'headline','open_to','work_since','prev_work'];
        long text[] := array['skills','social_work','achievements','prev_work'];
        clean jsonb;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  select coalesce(jsonb_object_agg(k, left(btrim(p->>k), case when k = any(long) then 1000 else 200 end)), '{}'::jsonb)
    into clean from unnest(keys) k where nullif(btrim(p->>k), '') is not null;
  clean := clean || jsonb_build_object('show_family', coalesce((p->>'show_family')::boolean, true));
  insert into public.cm_user_profiles as cp (user_id, about, updated_at) values (auth.uid(), clean, now())
  on conflict (user_id) do update set about = excluded.about, updated_at = now();
end $$;
