-- Search and filter across every labeled open NYC job (web app's job list).
-- jobs_search tidies job_listings for filtering: one work mode per job, a
-- seniority for every job, and whether the interview process is known.

create or replace view jobs_search as
select id, board_key, company_name, title, first_seen_at, industry, role_family,
       coalesce(seniority, 'unknown') as seniority,
       case
         when lower(coalesce(work_mode, workplace_type, '')) like '%remote%' then 'remote'
         when lower(coalesce(work_mode, workplace_type, '')) like '%hybrid%' then 'hybrid'
         else 'onsite'
       end as mode,
       salary_min_annual, salary_max_annual,
       interview_process is not null as has_process,
       interview_process, summary, skills
from job_listings
where processed_at is not null;

-- How many jobs have each filter value, across all jobs (not narrowed by other filters).
create or replace view job_facets as
select 'role' as facet, role_family as value, count(*)::int as n from jobs_search where role_family is not null group by role_family
union all
select 'ind', industry, count(*)::int from jobs_search where industry is not null group by industry
union all
select 'mode', mode, count(*)::int from jobs_search group by mode
union all
select 'lvl', seniority, count(*)::int from jobs_search group by seniority;

revoke all on jobs_search, job_facets from anon, authenticated;
grant select on jobs_search, job_facets to anon, authenticated;
