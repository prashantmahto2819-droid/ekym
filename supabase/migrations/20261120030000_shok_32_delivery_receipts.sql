-- पत्र पहुँचा / पढ़ा गया: Vivid Relay के "message.receipt" webhook से (edge function shok-receipt)।
alter table public.letter_recipients
  add column if not exists wa_message_id text,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;
create index if not exists letter_recipients_wa_msg on public.letter_recipients(wa_message_id) where wa_message_id is not null;
grant select (delivered_at, read_at) on public.letter_recipients to authenticated;

alter table public.shok_phone_welcomes
  add column if not exists wa_message_id text,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

-- webhook से (सिर्फ़ service role): संदेश id के हिसाब से पहुँचा / पढ़ा दर्ज करें
create or replace function public.shok_receipt(p_ids text[], p_status text, p_at timestamptz)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_status = 'read' then
    update public.letter_recipients set read_at = coalesce(read_at, p_at), delivered_at = coalesce(delivered_at, p_at) where wa_message_id = any(p_ids);
  else
    update public.letter_recipients set delivered_at = coalesce(delivered_at, p_at) where wa_message_id = any(p_ids);
  end if;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.shok_receipt(text[], text, timestamptz) from public, anon, authenticated;
grant execute on function public.shok_receipt(text[], text, timestamptz) to service_role;

-- सुपर एडमिन: Vivid Relay webhook का secret सहेजना (ब्राउज़र से सीधे डेटाबेस में; कभी वापस नहीं दिखता)
create or replace function public.shok_receipt_secret_set(p_secret text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((select p.super_admin from public.profiles p where p.id = auth.uid()), false) then raise exception 'सिर्फ़ सुपर एडमिन'; end if;
  if length(btrim(coalesce(p_secret, ''))) < 16 then raise exception 'secret बहुत छोटा है'; end if;
  update public.server_secrets set value = btrim(p_secret) where key = 'relay_webhook_secret';
  if not found then insert into public.server_secrets (key, value) values ('relay_webhook_secret', btrim(p_secret)); end if;
end $$;
revoke all on function public.shok_receipt_secret_set(text) from public, anon;
grant execute on function public.shok_receipt_secret_set(text) to authenticated;

-- जुड़ा है या नहीं + पिछले 7 दिन में कितनी रसीदें आईं (सुपर एडमिन / एडमिन को दिखाने के लिए)
create or replace function public.shok_receipt_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then jsonb_build_object(
    'secret_set', exists (select 1 from public.server_secrets where key = 'relay_webhook_secret'),
    'delivered_7d', (select count(*) from public.letter_recipients where delivered_at > now() - interval '7 days'),
    'sent_7d', (select count(*) from public.letter_recipients where sent_at > now() - interval '7 days' and status = 'sent'))
  else '{}'::jsonb end;
$$;
grant execute on function public.shok_receipt_status() to authenticated;
