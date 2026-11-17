-- विधानसभा क्षेत्र: मूल ग्राम (सामाजिक क्षेत्र के आश्रित गाँव), निवास गाँव और यूज़र के पते में
alter table public.origin_villages add column if not exists vidhansabha text;
alter table public.villages add column if not exists vidhansabha text;
alter table public.profiles add column if not exists vidhansabha text;

-- यूज़र अपना पता भरते समय यह खुद भर सके (profiles पर कॉलम-वार अनुमति है)
grant insert (vidhansabha), update (vidhansabha) on public.profiles to authenticated;
grant select (vidhansabha) on public.profiles to authenticated;

-- एडमिन: एक या कई मूल ग्रामों की विधानसभा
create or replace function public.set_origin_vidhansabha(p_ids uuid[], p_vidhansabha text)
returns integer language plpgsql security definer set search_path = 'public' as $$
declare n integer;
begin
  perform public.admin_only();
  update public.origin_villages set vidhansabha = nullif(btrim(coalesce(p_vidhansabha, '')), '') where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.set_origin_vidhansabha(uuid[], text) from public, anon;
grant execute on function public.set_origin_vidhansabha(uuid[], text) to authenticated;

-- सुझाव-सूची: अब तक लिखी गई विधानसभाएँ
create or replace function public.vidhansabha_names()
returns table (name text) language sql stable security definer set search_path = 'public' as $$
  select distinct x from (
    select btrim(vidhansabha) x from public.origin_villages union all
    select btrim(vidhansabha) from public.villages union all
    select btrim(vidhansabha) from public.profiles) s
  where coalesce(x, '') <> '' and public.is_approved() order by 1;
$$;
grant execute on function public.vidhansabha_names() to authenticated;
