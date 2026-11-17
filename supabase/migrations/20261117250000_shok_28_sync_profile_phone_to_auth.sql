-- WhatsApp OTP लॉगिन: जिनका खाता ईमेल से बना था पर प्रोफ़ाइल में मोबाइल दर्ज है, उनका मोबाइल लॉगिन-खाते (auth.users) में भी डालें।
-- नहीं तो उस नंबर से OTP लॉगिन करने पर नया खाता बनने की कोशिश होती थी और "Database error saving new user" आता था
-- (profiles.phone एक ही बार हो सकता है)। अब उसी पुराने खाते में लॉगिन होगा।
update auth.users u set phone = p.phone
  from public.profiles p
 where p.id = u.id and coalesce(p.phone, '') ~ '^91[0-9]{10}$' and coalesce(u.phone, '') = ''
   and not exists (select 1 from auth.users x where x.phone = p.phone and x.id <> u.id);

-- आगे भी: प्रोफ़ाइल में मोबाइल भरते / बदलते ही, अगर लॉगिन-खाते में कोई मोबाइल नहीं है तो वही डाल दें
create or replace function public.trg_profile_phone_to_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.phone, '') ~ '^91[0-9]{10}$' and new.phone is distinct from old.phone then
    update auth.users u set phone = new.phone
     where u.id = new.id and coalesce(u.phone, '') = ''
       and not exists (select 1 from auth.users x where x.phone = new.phone and x.id <> new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_profile_phone_to_auth on public.profiles;
create trigger trg_profile_phone_to_auth after update of phone on public.profiles
  for each row execute function public.trg_profile_phone_to_auth();
