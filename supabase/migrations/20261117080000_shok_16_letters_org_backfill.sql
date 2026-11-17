-- पुराने पत्र (संस्था-व्यवस्था से पहले, शोकपत्र ऐप से) प्रगतिशील समाज के — ताकि डैशबोर्ड की गिनती में आएँ
update public.letters set organization_id = public.shok_home_org() where organization_id is null;
update public.families set organization_id = public.shok_home_org() where organization_id is null;
