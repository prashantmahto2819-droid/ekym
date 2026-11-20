-- मालिक (2026-11-20): हमारा गेटवे इन तीन के लिए — प्रगतिशील (अपनी संस्था), EKYM और Kalchuri One (मूल)। आगे बनने वाली नई संस्थाओं को नहीं।
insert into public.shok_relay_allot (organization_id, note)
select o.id, 'मालिक की अनुमति 2026-11-20' from core.organizations o where o.slug in ('ekym', 'kalchuri-one')
on conflict (organization_id) do nothing;
