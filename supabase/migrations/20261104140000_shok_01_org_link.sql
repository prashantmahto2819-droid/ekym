-- Kalchuri One: which organization a condolence letter was sent on behalf of (nullable; shokpatra leaves it null).
alter table public.letters add column if not exists organization_id uuid references core.organizations(id) on delete set null;
create index if not exists letters_organization_idx on public.letters(organization_id);
comment on column public.letters.organization_id is 'Kalchuri One organization the letter was sent for (null = shokpatra app)';
