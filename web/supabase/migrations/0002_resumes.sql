-- Resume files and the text read from them.

alter table profiles
  add column if not exists resume_file_name text,
  add column if not exists resume_text      text,      -- used for matching
  add column if not exists links            text[] not null default '{}';

-- Private bucket: each person can only reach files under resumes/<their user id>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760,
        array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "resumes: own files read" on storage.objects;
drop policy if exists "resumes: own files insert" on storage.objects;
drop policy if exists "resumes: own files update" on storage.objects;
drop policy if exists "resumes: own files delete" on storage.objects;

create policy "resumes: own files read" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes: own files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes: own files update" on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes: own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Signed-out visitors never touch personal tables.
revoke all on profiles, preferences, job_feedback, tracked_jobs, plans from anon;
