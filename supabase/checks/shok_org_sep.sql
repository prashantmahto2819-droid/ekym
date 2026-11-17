-- संस्था-वार अलगाव की जाँच (rolled back): EKYM में परिवार बनाकर देखें कि प्रगतिशील का "सभी गाँव" एडमिन उसे न सँभाल सके
do $$
declare home uuid := public.shok_home_org(); ekym uuid; f_home uuid; f_ekym uuid; adm uuid; sup uuid;
begin
  select id into ekym from core.organizations where slug = 'ekym';
  select id into adm from public.profiles where role = 'admin' and status = 'approved' and not super_admin limit 1;
  select id into sup from public.profiles where super_admin limit 1;
  select id into f_home from public.families where organization_id = home and status = 'approved' limit 1;
  insert into public.families (family_name, main_whatsapp, owner_id, organization_id, status) values ('जाँच परिवार', '919999999990', sup, ekym, 'approved') returning id into f_ekym;
  raise notice 'home org: %, ekym: %', home, ekym;
  raise notice 'pragatishil admin manages pragatishil family: %', public.admin_can_manage_family(adm, f_home);
  raise notice 'pragatishil admin manages EKYM family (should be f unless platform admin): %', public.admin_can_manage_family(adm, f_ekym);
  raise notice 'super manages EKYM family: %', public.admin_can_manage_family(sup, f_ekym);
  raise notice 'org_in(ekym family, home): %, org_in(ekym, ekym): %', public.shok_org_in(ekym, home), public.shok_org_in(ekym, ekym);
  raise notice 'shok_org_info: %', public.shok_org_info();
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm;
end $$;
