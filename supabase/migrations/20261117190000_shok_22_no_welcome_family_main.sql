-- मालिक (2026-11-17): परिवार के मुख्य WhatsApp नंबर पर स्वागत संदेश न जाए — सिर्फ़ सदस्यों के अपने नंबर पर।
create or replace function public.trg_family_phone_welcome() returns trigger
language plpgsql security definer set search_path = 'public' as $$
begin
  return new;
end $$;

update public.shok_phone_welcomes set status = 'skipped', error = 'परिवार का मुख्य नंबर — स्वागत संदेश बंद'
 where kind = 'family_main' and status = 'queued';
