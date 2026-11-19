-- Keep page data in memory. The database caches about 224 MB; pages need about
-- 90 MB (the stored job list, labels, requirements and signals), but polls and
-- labeling read the 238 MB postings table and push that out, so the first page
-- after a run was several times slower. refresh_jobs_search() now loads the page
-- data back into the cache after each refresh.

create extension if not exists pg_prewarm with schema extensions;

create or replace function refresh_jobs_search()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare t regclass;
begin
  refresh materialized view concurrently jobs_search;
  foreach t in array array['jobs_search', 'jobs_search_id', 'job_features', 'job_features_pkey',
                           'job_reqs', 'job_reqs_pkey', 'job_signals', 'job_signals_pkey']::regclass[] loop
    perform pg_prewarm(t);
  end loop;
  -- the embeddings live in job_features' TOAST table
  perform pg_prewarm(reltoastrelid) from pg_class where oid = 'job_features'::regclass and reltoastrelid <> 0;
exception when undefined_function then
  null;  -- pg_prewarm not available: the refresh still happened
end $$;
revoke all on function refresh_jobs_search() from public, anon, authenticated;

select refresh_jobs_search();
