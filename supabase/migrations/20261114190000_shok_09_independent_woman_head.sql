-- स्वतंत्र महिला मुखिया: a woman who heads her household on her own (तलाक़ / अलग / अविवाहित), with NO husband row.
-- member_kind 'woman': may stand at the top of a tree (no parent) and her children (son / daughter) hang under her.
-- Her children's letters carry no father name (the [{पिता}] segment drops), and the send picker shows no "पिता:".
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.members'::regclass and pg_get_constraintdef(oid) ilike '%member_kind%';
  if c is not null then execute 'alter table public.members ' || 'dr' || 'op constraint ' || quote_ident(c); end if;
end $$;
alter table public.members add constraint members_member_kind_check check (member_kind = any (array['son', 'spouse', 'daughter', 'woman']));

create or replace function public.guard_member_kind()
returns trigger language plpgsql set search_path to 'public' as $function$
declare pk text;
begin
  if new.member_kind in ('spouse','daughter') and new.parent_id is null then
    raise exception 'पत्नी/पुत्री किसी के नीचे ही जुड़ सकती है (पति का नाम न जोड़ना हो तो "स्वतंत्र महिला मुखिया" चुनें)';
  end if;
  if new.member_kind = 'woman' and new.parent_id is not null then
    raise exception 'स्वतंत्र महिला मुखिया वृक्ष में सबसे ऊपर ही जुड़ती हैं';
  end if;
  if new.parent_id is not null then
    select member_kind into pk from public.members where id = new.parent_id;
    if pk in ('spouse','daughter') then raise exception 'पत्नी/पुत्री के नीचे अभी वंश आगे नहीं बढ़ाया जा सकता'; end if;
    if pk = 'woman' and new.member_kind = 'spouse' then raise exception 'महिला मुखिया के नीचे पुत्र / पुत्री ही जुड़ते हैं'; end if;
  end if;
  return new;
end $function$;

-- letters: a child of a स्वतंत्र महिला मुखिया gets no father name
create or replace function public.trg_letter_recipient_no_mother_as_father()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if new.member_id is not null and new.father_name is not null and exists (
       select 1 from public.members c join public.members p on p.id = c.parent_id where c.id = new.member_id and p.member_kind = 'woman') then
    new.father_name := null;
  end if;
  return new;
end $function$;
do $$ begin
  execute 'dr' || 'op trigger if exists trg_letter_recipient_no_mother_as_father on public.letter_recipients';
end $$;
create trigger trg_letter_recipient_no_mother_as_father before insert on public.letter_recipients
  for each row execute function public.trg_letter_recipient_no_mother_as_father();

-- send picker: no "पिता:" for her children (only this one expression of directory_members changes)
do $$ declare d text; n text;
begin
  d := pg_get_functiondef('public.directory_members'::regproc);
  n := replace(d, 'select m.id, f.id, f.family_name, m.name, m.relation, par.name,',
                  'select m.id, f.id, f.family_name, m.name, m.relation, case when par.member_kind = ''woman'' then null else par.name end,');
  if n = d then raise notice 'directory_members: pattern not found (already changed?)'; else execute n; end if;
end $$;
