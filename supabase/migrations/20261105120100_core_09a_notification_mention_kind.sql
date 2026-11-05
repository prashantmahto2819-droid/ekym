alter table public.cm_notifications drop constraint cm_notifications_kind_check;
alter table public.cm_notifications add constraint cm_notifications_kind_check check (kind in ('like','comment','reply','moderation','appeal','mention'));
