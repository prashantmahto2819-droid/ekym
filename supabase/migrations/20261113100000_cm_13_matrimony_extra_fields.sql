-- Phase 44: matrimony profiles get the owner's own point-wise details (family, birth/horoscope, other).
-- extra_fields = [{ "g": "family"|"birth"|"personal"|"other", "k": "पिता का नाम", "v": "श्री …" }, …] (max 40 rows, kept in order).
alter table public.cm_matrimony_profiles add column if not exists extra_fields jsonb not null default '[]'::jsonb;
do $$ begin
  alter table public.cm_matrimony_profiles add constraint cm_matrimony_extra_fields_chk
    check (jsonb_typeof(extra_fields) = 'array' and jsonb_array_length(extra_fields) <= 40 and length(extra_fields::text) <= 12000);
exception when duplicate_object then null; end $$;
grant select (extra_fields), insert (extra_fields), update (extra_fields) on public.cm_matrimony_profiles to authenticated;

drop function if exists public.k1_matrimony_browse(uuid, text);
create or replace function public.k1_matrimony_browse(p_org uuid, p_gender text default null)
returns table (id uuid, display_name text, gender text, age int, height_cm int, education text, profession text, income_range text, city text, district text, gotra text, native_place text, about text, expectations text, photo_path text, created_for text, verified boolean, my_interest text, their_interest text, photos text[], interests text, special_note text, extra_fields jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.gender, extract(year from current_date)::int - p.birth_year, p.height_cm, p.education, p.profession, p.income_range, p.city, p.district, p.gotra, p.native_place, p.about, p.expectations, p.photo_path, p.created_for, p.verified_at is not null,
         (select i.status from public.cm_matrimony_interests i join public.cm_matrimony_profiles mine on mine.id = i.from_profile where mine.user_id = auth.uid() and i.to_profile = p.id limit 1),
         (select i.status from public.cm_matrimony_interests i join public.cm_matrimony_profiles mine on mine.id = i.to_profile where mine.user_id = auth.uid() and i.from_profile = p.id limit 1),
         p.photos, p.interests, p.special_note, p.extra_fields
    from public.cm_matrimony_profiles p
   where p.organization_id = p_org and p.status = 'active' and p.verified_at is not null and p.user_id <> auth.uid()
     and (p_gender is null or p.gender = p_gender)
     and public.k1_is_member(p_org)
   order by p.verified_at desc;
$$;
revoke all on function public.k1_matrimony_browse(uuid, text) from public, anon;
grant execute on function public.k1_matrimony_browse(uuid, text) to authenticated;

-- share page also returns the point-wise details
do $$
declare d text;
begin
  d := pg_get_functiondef('public.k1_matrimony_public(text)'::regprocedure);
  if position('extra_fields' in d) = 0 then
    d := replace(d, '''interests'', p.interests,', '''interests'', p.interests, ''extra_fields'', p.extra_fields, ''special_note'', p.special_note,');
    execute d;
  end if;
end $$;
