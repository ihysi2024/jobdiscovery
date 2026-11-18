-- Open NYC jobs and typical pay by role type and industry, for onboarding's
-- market step. Built on job_listings (created by the poller), so it only covers
-- jobs that have been labeled. Rows with all_roles/all_industries set are totals.
-- Note: job_listings can still gain columns (CREATE OR REPLACE VIEW appends them);
-- dropping or reordering its columns would need this view dropped first.

create or replace view market_stats as
select role_family, industry,
       grouping(role_family) = 1 as all_roles,
       grouping(industry) = 1    as all_industries,
       count(*)::int                  as openings,
       count(salary_min_annual)::int  as with_pay,
       percentile_cont(0.5) within group (order by salary_min_annual) as pay_lo,
       percentile_cont(0.5) within group (order by salary_max_annual) as pay_hi
from job_listings
where processed_at is not null and role_family is not null and industry is not null
group by grouping sets ((role_family, industry), (role_family), (industry), ());

revoke all on market_stats from anon, authenticated;
grant select on market_stats to anon, authenticated;
