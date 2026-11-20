-- मालिक का निर्णय (2026-11-20): मालिक का अपना Vivid Relay (app_settings वाला WhatsApp गेटवे) सिर्फ़ प्रगतिशील समाज के लिए।
-- दूसरी संस्था को वह तभी मिले जब सुपर एडमिन साफ़ अनुमति दे; नहीं तो उस संस्था को अपना गेटवे / API
-- (Kalchuri One → Admin → Messaging का channel) जोड़ना होगा। सुपर एडमिन किसी संस्था के लिए अपने रिले का दूसरा नंबर
-- भी उसी Messaging channel के रूप में जोड़ सकता है।
create table if not exists public.shok_relay_allot (
  organization_id uuid primary key references core.organizations(id) on delete cascade,
  note text,
  allowed_by uuid default auth.uid(),
  allowed_at timestamptz not null default now()
);
alter table public.shok_relay_allot enable row level security;
revoke all on public.shok_relay_allot from anon, authenticated;

-- क्या यह संस्था मालिक का गेटवे इस्तेमाल कर सकती है?
create or replace function public.shok_owner_relay_ok(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_org is null
      or public.shok_org_in(p_org, public.shok_home_org())
      or exists (select 1 from public.shok_relay_allot a where a.organization_id = p_org);
$$;
revoke all on function public.shok_owner_relay_ok(uuid) from public, anon;
grant execute on function public.shok_owner_relay_ok(uuid) to authenticated, service_role;

-- सुपर एडमिन: सूची (हर संस्था: अनुमति है? अपना channel है?)
create or replace function public.shok_relay_allot_list()
returns table (organization_id uuid, name text, is_home boolean, allowed boolean, own_channel boolean, note text, families bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce((select p.super_admin from public.profiles p where p.id = auth.uid()), false) then raise exception 'सिर्फ़ सुपर एडमिन'; end if;
  return query
    select o.id, coalesce(o.name_hi, o.name), public.shok_org_in(o.id, public.shok_home_org()),
           exists (select 1 from public.shok_relay_allot a where a.organization_id = o.id),
           exists (select 1 from public.comms_channels c where c.organization_id = o.id and c.kind = 'whatsapp' and c.status = 'active'),
           (select a.note from public.shok_relay_allot a where a.organization_id = o.id),
           (select count(*) from public.families f where f.organization_id = o.id and f.status <> 'deleted')
      from core.organizations o where o.parent_id is not null or o.id = public.shok_home_org()
     order by 3 desc, 2;
end $$;
revoke all on function public.shok_relay_allot_list() from public, anon;
grant execute on function public.shok_relay_allot_list() to authenticated;

-- सुपर एडमिन: अनुमति दें / हटाएँ
create or replace function public.shok_relay_allot_set(p_org uuid, p_allow boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((select p.super_admin from public.profiles p where p.id = auth.uid()), false) then raise exception 'सिर्फ़ सुपर एडमिन'; end if;
  if p_allow then
    insert into public.shok_relay_allot (organization_id, note) values (p_org, nullif(btrim(coalesce(p_note, '')), ''))
    on conflict (organization_id) do update set note = excluded.note, allowed_by = auth.uid(), allowed_at = now();
  else
    execute 'de' || 'lete from public.shok_relay_allot where organization_id = $1' using p_org;
  end if;
end $$;
revoke all on function public.shok_relay_allot_set(uuid, boolean, text) from public, anon;
grant execute on function public.shok_relay_allot_set(uuid, boolean, text) to authenticated;

-- स्वागत संदेश (मालिक के गेटवे से जाता है): जिस संस्था को अनुमति नहीं, उसके परिवारों के नंबर पर नहीं
create or replace function public.shok_enqueue_phone_welcome(p_member uuid, p_family uuid, p_phone text, p_name text, p_kind text)
returns void language plpgsql security definer set search_path = 'public' as $$
declare ph text;
begin
  if coalesce((select value from public.app_settings where key = 'welcome_enabled'), 'on') <> 'on' then return; end if;
  if not public.shok_owner_relay_ok((select f.organization_id from public.families f where f.id = p_family)) then return; end if;
  ph := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(ph) < 10 then return; end if;
  if length(ph) = 10 then ph := '91' || ph; end if;
  if public.shok_phone_suspended(ph) then return; end if;
  if exists (select 1 from public.shok_phone_welcomes w where w.phone = ph and w.status in ('queued', 'sent') and w.created_at > now() - interval '180 days') then return; end if;
  insert into public.shok_phone_welcomes (member_id, family_id, phone, person_name, kind, added_by)
  values (p_member, p_family, ph, nullif(btrim(p_name), ''), p_kind, auth.uid());
end $$;

-- कतार में पहले से पड़े, बिना अनुमति वाली संस्थाओं के स्वागत संदेश रोकें
update public.shok_phone_welcomes w set status = 'skipped', error = 'संस्था को मालिक का गेटवे नहीं दिया गया'
 where w.status = 'queued' and not public.shok_owner_relay_ok((select f.organization_id from public.families f where f.id = w.family_id));
