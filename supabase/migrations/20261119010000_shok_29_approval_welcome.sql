-- खाता मंज़ूर होते ही (एडमिन की मंज़ूरी या नंबर से अपने-आप) यूज़र को WhatsApp पर स्वागत संदेश।
-- सिर्फ़ शोकपत्र सेवा के यूज़र (जिन्होंने "मेरी जानकारी" भरी है), pending → approved पर एक बार; निलंबित नंबर पर नहीं।
create or replace function public.trg_profile_approved_welcome() returns trigger
language plpgsql security definer set search_path = 'public' as $$
declare msg text;
begin
  if new.status = 'approved' and old.status = 'pending' and new.details_done_at is not null
     and coalesce(new.phone, '') ~ '^91[0-9]{10}$' and not public.shok_phone_suspended(new.phone) then
    msg := 'नमस्ते ' || coalesce(nullif(btrim(new.full_name), ''), '') || ' जी 🙏' || E'\n\n'
        || 'प्रगतिशील जायसवाल कन्नौजिया कलार समाज की *शोकपत्र सेवा* में आपका खाता मंज़ूर हो गया है। स्वागत है!' || E'\n\n'
        || 'अब आप:' || E'\n'
        || '• अपने परिवार का वंश वृक्ष बना / पूरा कर सकते हैं' || E'\n'
        || '• समाज के परिवारों में नाम सुझा सकते हैं' || E'\n'
        || '• शोकपत्र और सूचना / आमंत्रण भेज सकते हैं' || E'\n\n'
        || 'लॉगिन: https://shokpatra.kalchuri.org/login.html' || E'\n'
        || '(इसी नंबर से "व्हाट्सएप OTP" चुनें)' || E'\n\n'
        || 'यह नंबर "शोकपत्र सेवा" नाम से सेव कर लें, ताकि आगे के संदेश मिलते रहें।';
    begin
      perform public.notify_whatsapp_phone(new.phone, msg);
    exception when others then null; -- संदेश न जा पाए तो भी मंज़ूरी न रुके
    end;
  end if;
  return new;
end $$;
drop trigger if exists trg_profile_approved_welcome on public.profiles;
create trigger trg_profile_approved_welcome after update of status on public.profiles
  for each row execute function public.trg_profile_approved_welcome();
