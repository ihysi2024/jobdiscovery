-- Onboarding's market step ("Here's what's hiring in New York right now").
--
-- 1. market_stats read job_listings, a live view over the 238 MB postings table, and
--    took percentiles over every grouping on each page load. That was slow enough to
--    fail, and the page then showed "Market numbers aren't available right now".
--    It also counted repeat postings that the job list merges. Read the stored,
--    merged job list (jobs_search) instead, which is kept in memory after each run.
--
-- 2. suggested_lanes(): the kinds of work to suggest, from the person's background and
--    long-term goals rather than only from jobs they liked in quick picks. It counts the
--    role types of their best-matching jobs (match_jobs ranks on resume, experience and
--    goals), so someone who liked nothing still gets suggestions.

create or replace view market_stats as
select role_family, industry,
       grouping(role_family) = 1 as all_roles,
       grouping(industry) = 1    as all_industries,
       count(*)::int                  as openings,
       count(salary_min_annual)::int  as with_pay,
       percentile_cont(0.5) within group (order by salary_min_annual) as pay_lo,
       percentile_cont(0.5) within group (order by salary_max_annual) as pay_hi
from jobs_search
where role_family is not null and industry is not null
group by grouping sets ((role_family, industry), (role_family), (industry), ());

revoke all on market_stats from anon, authenticated;
grant select on market_stats to anon, authenticated;

create or replace function suggested_lanes(p_limit int default 6)
returns table (role_family text, matches int)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select j.role_family, count(*)::int as matches
  from match_jobs(p_limit => 100) m
  join jobs_search j on j.id = m.id
  where j.role_family is not null
  group by j.role_family
  order by count(*) desc, max(m.score) desc
  limit greatest(1, least(p_limit, 12))
$$;

revoke all on function suggested_lanes(int) from public, anon;
grant execute on function suggested_lanes(int) to authenticated;
