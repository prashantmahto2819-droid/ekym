-- event managers may store invitation images under documents/<org>/events/…
create policy documents_events_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[2] = 'events' and core.can(((storage.foldername(name))[1])::uuid, 'events.manage'));
create policy documents_events_update on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[2] = 'events' and core.can(((storage.foldername(name))[1])::uuid, 'events.manage'));
