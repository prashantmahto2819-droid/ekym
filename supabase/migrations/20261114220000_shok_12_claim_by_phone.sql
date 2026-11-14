-- शोक पत्र: डेटा जो एडमिन ने किसी के मोबाइल नंबर के साथ भरा, वह उसी नंबर से लॉग इन करने पर उसे मिले।
-- Before: only families from "+ परिवार जोड़ें (एडमिन)" (entered_by_admin + contact_phone) were handed over. Trees an admin
-- built where the person is मुखिया, or whose main WhatsApp is that number, stayed with the admin, so the person made a new
-- family, hit the duplicate-number guard, typed another number and created double entries.
-- Now claim_admin_families() hands over every tree family (not deleted, not a contact entry) that an ADMIN owns (or that
-- was entered by an admin) when the user's number is its contact number, its main WhatsApp, or the phone of its living
-- मुखिया — if the number is OTP-verified, or the name matches. A user whose number is OTP-verified and who receives an
-- already approved family is approved too (the admin already checked that family). shok_my_entries() lists every tree
-- where the user's number appears (also as an ordinary member), so the app can say "आप पहले से दर्ज हैं".
create or replace function public.claim_admin_families()
returns integer language plpgsql security definer set search_path to 'public', 'auth' as $function$
declare me public.profiles; verified boolean; ph text; nm text; n integer := 0; got_approved boolean := false; r record;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.status not in ('approved', 'pending') or coalesce(me.phone, '') = '' then return 0; end if;
  ph := regexp_replace(me.phone, '\D', '', 'g');
  nm := lower(regexp_replace(btrim(coalesce(me.full_name, '')), '\s+', ' ', 'g'));
  select exists (select 1 from auth.users u where u.id = me.id and u.phone_confirmed_at is not null
                 and regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') = ph) into verified;
  for r in
    select f.id, f.status from public.families f
     where f.kind = 'tree' and f.status <> 'deleted' and f.owner_id <> me.id
       and (f.entered_by_admin or exists (select 1 from public.profiles o where o.id = f.owner_id and o.role = 'admin'))
       and (
         (regexp_replace(coalesce(f.contact_phone, ''), '\D', '', 'g') = ph
            and (verified or lower(regexp_replace(btrim(coalesce(f.contact_name, '')), '\s+', ' ', 'g')) = nm))
         or (regexp_replace(coalesce(f.main_whatsapp, ''), '\D', '', 'g') = ph and verified)
         or exists (select 1 from public.members m where m.family_id = f.id and m.is_head and not coalesce(m.is_deceased, false)
                      and regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') = ph
                      and (verified or lower(regexp_replace(btrim(m.name), '\s+', ' ', 'g')) = nm))
       )
  loop
    update public.families set owner_id = me.id, claimed_at = now() where id = r.id;
    n := n + 1;
    if r.status = 'approved' then got_approved := true; end if;
  end loop;
  if n > 0 and verified and got_approved and me.status = 'pending' then
    update public.profiles set status = 'approved' where id = me.id and status = 'pending';
  end if;
  return n;
end $function$;

/** Every tree where my (profile) number appears: as मुखिया, as a member, or as the family's main WhatsApp. */
create or replace function public.shok_my_entries()
returns table(family_id uuid, family_name text, village_name text, member_name text, is_head boolean, mine boolean, family_status text)
language sql stable security definer set search_path to 'public' as $function$
  with me as (select p.id, regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') ph from public.profiles p where p.id = auth.uid())
  select distinct on (f.id) f.id, f.family_name, v.name, m.name, coalesce(m.is_head, false), f.owner_id = me.id, f.status
    from me join public.families f on f.kind = 'tree' and f.status <> 'deleted'
    left join public.members m on m.family_id = f.id and regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') = me.ph
    left join public.villages v on v.id = f.village_id
   where length(me.ph) >= 10 and (m.id is not null or regexp_replace(coalesce(f.main_whatsapp, ''), '\D', '', 'g') = me.ph)
   order by f.id, m.is_head desc nulls last;
$function$;
revoke all on function public.shok_my_entries() from public, anon;
grant execute on function public.shok_my_entries() to authenticated;
