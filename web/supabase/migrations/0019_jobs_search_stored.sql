-- Faster pages: jobs_search merged repeat postings on the fly (a window over all
-- open NYC jobs) every time the job list, filter counts or Best match ran. Jobs only
-- change when a poll or labeling run finishes, so keep the merged list stored and
-- refresh it after those runs (refresh_jobs_search(), called by the classify
-- workflow when a poll finishes and when labeling ends).

do $$
declare def text := pg_get_viewdef('jobs_search'::regclass, true);
begin
  execute 'create materialized view jobs_search_stored as ' || def;
end $$;

drop view if exists job_facets;
drop view jobs_search;
alter materialized view jobs_search_stored rename to jobs_search;

create unique index jobs_search_id on jobs_search (id);
create index jobs_search_new on jobs_search (first_seen_at desc, id desc);
create index jobs_search_role on jobs_search (role_family);
create index jobs_search_pay on jobs_search (salary_max_annual desc nulls last);

-- Same totals view as before, now over the stored list.
create view job_facets as
select 'role' as facet, role_family as value, count(*)::int as n from jobs_search where role_family is not null group by role_family
union all
select 'ind', industry, count(*)::int from jobs_search where industry is not null group by industry
union all
select 'mode', mode, count(*)::int from jobs_search group by mode
union all
select 'lvl', seniority, count(*)::int from jobs_search group by seniority;

revoke all on jobs_search, job_facets from anon, authenticated;
grant select on jobs_search, job_facets to anon, authenticated;

create or replace function refresh_jobs_search()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently jobs_search;
end $$;
revoke all on function refresh_jobs_search() from public, anon, authenticated;

analyze jobs_search;
