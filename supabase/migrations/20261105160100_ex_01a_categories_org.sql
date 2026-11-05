-- ex_categories carries organization_id (copied from the exam) so the generic admin table editor can list/insert it
alter table public.ex_categories add column if not exists organization_id uuid references core.organizations(id) on delete cascade;
create or replace function public.trg_ex_category_org() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select e.organization_id into new.organization_id from public.ex_exams e where e.id = new.exam_id;
  return new;
end $$;
create trigger trg_ex_category_org before insert or update of exam_id on public.ex_categories for each row execute function public.trg_ex_category_org();
update public.ex_categories c set organization_id = e.organization_id from public.ex_exams e where e.id = c.exam_id and c.organization_id is null;
