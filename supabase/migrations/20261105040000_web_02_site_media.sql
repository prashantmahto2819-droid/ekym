-- Kalchuri One · Phase 16 · public media bucket for website-builder uploads (site-media/<org>/pages/…)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']) on conflict (id) do nothing;
create policy site_media_public_read on storage.objects for select using (bucket_id = 'site-media');
create policy site_media_write on storage.objects for insert to authenticated with check (bucket_id = 'site-media' and (core.can(((storage.foldername(name))[1])::uuid, 'cms.settings.edit') or core.can(((storage.foldername(name))[1])::uuid, 'cms.media.manage') or core.can(((storage.foldername(name))[1])::uuid, 'cms.post.create')));
create policy site_media_update on storage.objects for update to authenticated using (bucket_id = 'site-media' and core.can(((storage.foldername(name))[1])::uuid, 'cms.settings.edit'));
create policy site_media_delete on storage.objects for delete to authenticated using (bucket_id = 'site-media' and core.can(((storage.foldername(name))[1])::uuid, 'cms.settings.edit'));
