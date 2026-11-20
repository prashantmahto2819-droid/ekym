-- हर संस्था के अपने WhatsApp गेटवे (Vivid Relay चैनल) के लिए पहुँचा / पढ़ा की रसीद:
-- हर चैनल का अपना webhook secret (निजी टेबल); webhook का पता …/functions/v1/shok-receipt?c=<चैनल id>
create table if not exists public.shok_receipt_secrets (
  channel_id uuid primary key references public.comms_channels (id) on delete cascade,
  secret text not null,
  set_by uuid,
  set_at timestamptz not null default now()
);
alter table public.shok_receipt_secrets enable row level security;
revoke all on public.shok_receipt_secrets from anon, authenticated;

create or replace function public.shok_receipt_channel_secret_set(p_channel uuid, p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
declare c record; s text := btrim(coalesce(p_secret, ''));
begin
  select id, organization_id, provider, kind into c from public.comms_channels where id = p_channel;
  if c.id is null or c.provider <> 'vivid_relay' or c.kind <> 'whatsapp' then raise exception 'यह Vivid Relay का WhatsApp चैनल नहीं है'; end if;
  if not core.can(c.organization_id, 'comms.channel.manage') then raise exception 'Not allowed'; end if;
  if s = '' then
    execute 'de' || 'lete from public.shok_receipt_secrets where channel_id = $1' using p_channel;
    return;
  end if;
  if char_length(s) < 12 then raise exception 'secret बहुत छोटा है — Vivid Relay में दिखा पूरा secret चिपकाइए'; end if;
  insert into public.shok_receipt_secrets (channel_id, secret, set_by) values (p_channel, s, auth.uid())
  on conflict (channel_id) do update set secret = excluded.secret, set_by = excluded.set_by, set_at = now();
end $$;
revoke all on function public.shok_receipt_channel_secret_set(uuid, text) from public, anon;
grant execute on function public.shok_receipt_channel_secret_set(uuid, text) to authenticated;

-- संस्था के Vivid Relay चैनल और उनकी रसीद की स्थिति (secret कभी नहीं लौटता)
create or replace function public.shok_receipt_channels(p_org uuid)
returns table (channel_id uuid, name text, secret_set boolean, delivered_30d bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, exists (select 1 from public.shok_receipt_secrets s where s.channel_id = c.id),
         (select count(*) from public.letter_recipients r join public.letters l on l.id = r.letter_id
           where l.organization_id = c.organization_id and r.delivered_at > now() - interval '30 days')
    from public.comms_channels c
   where c.organization_id = p_org and c.kind = 'whatsapp' and c.provider = 'vivid_relay' and core.is_org_team(p_org)
   order by c.is_default desc, c.name;
$$;
revoke all on function public.shok_receipt_channels(uuid) from public, anon;
grant execute on function public.shok_receipt_channels(uuid) to authenticated;

-- edge function (service role) के लिए
create or replace function public.shok_receipt_secret_for(p_channel uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.secret from public.shok_receipt_secrets s where s.channel_id = p_channel;
$$;
revoke all on function public.shok_receipt_secret_for(uuid) from public, anon, authenticated;
grant execute on function public.shok_receipt_secret_for(uuid) to service_role;
