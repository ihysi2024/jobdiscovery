-- Some employers post one opening several times, once per office or city pair
-- (e.g. "Process Management Associate" at Oscar: NYC + Tempe, NYC + Dallas,
-- NYC + Atlanta). The job list treats postings from the same board with the same
-- original title and the same posted pay as one role, shows the oldest, and
-- says how many postings it stands for (copies). Everything reading jobs_search
-- (the list, filter counts, Best match) sees one role.

create or replace view jobs_search as
select id, board_key, company_name, title, first_seen_at, industry, role_family, seniority, mode,
       salary_min_annual, salary_max_annual, has_process, interview_process, summary, skills, copies
from (
  select id, board_key, company_name, title, first_seen_at, industry, role_family,
         coalesce(seniority, 'unknown') as seniority,
         case
           when lower(coalesce(work_mode, workplace_type, '')) like '%remote%' then 'remote'
           when lower(coalesce(work_mode, workplace_type, '')) like '%hybrid%' then 'hybrid'
           else 'onsite'
         end as mode,
         salary_min_annual, salary_max_annual,
         interview_process is not null as has_process,
         interview_process, summary, skills,
         count(*) over same_role as copies,
         row_number() over (same_role order by first_seen_at, id) as nth
  from job_listings
  where processed_at is not null
  window same_role as (
    partition by board_key, lower(regexp_replace(coalesce(posted_title, title), '\s+', ' ', 'g')),
                 coalesce(salary_min_annual, -1), coalesce(salary_max_annual, -1)
  )
) one_per_role
where nth = 1;

grant select on jobs_search to anon, authenticated;
