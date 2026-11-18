-- Adds a fit percentage to match_jobs() (see 0006). Changing the result columns
-- means dropping and re-creating the function.

drop function if exists match_jobs(text, text[], text[], text[], text[], boolean, int, int);

create or replace function match_jobs(
  p_q text default null,
  p_role text[] default null,
  p_ind text[] default null,
  p_mode text[] default null,
  p_lvl text[] default null,
  p_process boolean default false,
  p_limit int default 20,
  p_offset int default 0
)
returns table (id bigint, score real, fit real, reasons text[], total bigint)
language sql
stable
security definer
set search_path = public, extensions
as $$
with me as (
  select auth.uid() as uid
),
prof as (
  select p.embedding, p.years_experience from profiles p join me on p.user_id = me.uid
),
pref as (
  select coalesce(p.priorities, '{}') as priorities, coalesce(p.tradeoffs, '{}'::jsonb) as tradeoffs,
         coalesce(p.work_modes, '{}') as work_modes, coalesce(p.lanes, '{}') as lanes
  from preferences p join me on p.user_id = me.uid
),
liked_ids as (
  select f.posting_id from job_feedback f join me on f.user_id = me.uid where f.liked
  union
  select t.posting_id from tracked_jobs t join me on t.user_id = me.uid where t.posting_id is not null
),
passed_ids as (
  select f.posting_id from job_feedback f join me on f.user_id = me.uid where not f.liked
),
liked_v as (
  select avg(jf.embedding) as v from job_features jf where jf.posting_id in (select posting_id from liked_ids)
),
passed_v as (
  select avg(jf.embedding) as v from job_features jf where jf.posting_id in (select posting_id from passed_ids)
),
w as (
  -- weight of each priority by its rank (1st counts most); 0 if not picked
  select
    coalesce((select case array_position(priorities, 'comp') when 1 then 0.12 when 2 then 0.08 when 3 then 0.05 end from pref), 0) as w_comp,
    coalesce((select case array_position(priorities, 'flex') when 1 then 0.10 when 2 then 0.07 when 3 then 0.04 end from pref), 0) as w_flex,
    greatest(
      coalesce((select case array_position(priorities, 'mission') when 1 then 0.10 when 2 then 0.07 when 3 then 0.04 end from pref), 0),
      coalesce((select case when tradeoffs->>'mission' = 'Yes' then 0.06 when tradeoffs->>'mission' = 'Maybe' then 0.03 end from pref), 0)
    ) as w_mission,
    coalesce((select work_modes from pref), '{}') as modes,
    coalesce((select lanes from pref), '{}') as lanes
),
cand as (
  select s.id, s.title, s.company_name, s.industry, s.role_family, s.mode, s.salary_min_annual, s.salary_max_annual,
         s.first_seen_at, jl.years_experience_min,
         case when (select embedding from prof) is null then null else 1 - (jf.embedding <=> (select embedding from prof)) end as sim_bg,
         case when (select v from liked_v) is null then null else 1 - (jf.embedding <=> (select v from liked_v)) end as sim_liked,
         case when (select v from passed_v) is null then null else 1 - (jf.embedding <=> (select v from passed_v)) end as sim_passed
  from jobs_search s
  join job_features jf on jf.posting_id = s.id
  join job_listings jl on jl.id = s.id
  cross join w
  where (p_role is null or s.role_family = any(p_role))
    and (p_ind is null or s.industry = any(p_ind))
    and (p_lvl is null or s.seniority = any(p_lvl))
    and (not p_process or s.has_process)
    and (p_q is null or s.title ilike '%' || p_q || '%' or s.company_name ilike '%' || p_q || '%' or s.summary ilike '%' || p_q || '%')
    and (
      case
        when p_mode is not null then s.mode = any(p_mode)
        when cardinality(w.modes) = 0 then true
        else s.mode = any(array_replace(w.modes, 'office', 'onsite'))
      end
    )
    and s.id not in (select posting_id from passed_ids)
),
ranked as (
  select c.*,
    case when sim_bg is null then null else percent_rank() over (order by sim_bg) end as bg,
    case when sim_liked is null then null else percent_rank() over (order by sim_liked) end as lk,
    case when sim_passed is null then null else percent_rank() over (order by sim_passed) end as ps,
    case when salary_max_annual is null then null else percent_rank() over (partition by salary_max_annual is null order by salary_max_annual) end as pay,
    coalesce(case array_position(w.lanes, role_family) when 1 then 1.0 when 2 then 0.8 when 3 then 0.65 else case when role_family = any(w.lanes) then 0.5 end end, 0) as lane,
    case when industry in ('Healthcare Providers', 'Health Tech', 'Biotech & Pharma', 'Medical Devices & Diagnostics',
                           'Education & EdTech', 'Nonprofit', 'Government & Public Sector', 'Energy & Climate') then 1 else 0 end as mission,
    case mode when 'remote' then 1.0 when 'hybrid' then 0.7 else 0 end as flex,
    case when years_experience_min is not null and (select years_experience from prof) is not null
              and years_experience_min > (select years_experience from prof) + 2 then 1 else 0 end as stretch,
    exp(-greatest(0, extract(epoch from (now() - first_seen_at::timestamptz)) / 86400.0) / 21.0) as fresh
  from cand c cross join w
),
scored as (
  select r.*,
    ( 0.42 * coalesce(bg, 0) * (case when bg is null then 0 else 1 end)
    + 0.26 * coalesce(lk, 0)
    + 0.16 * lane
    + (select w_comp from w) * coalesce(pay, 0.3)
    + (select w_flex from w) * flex
    + (select w_mission from w) * mission
    + 0.05 * fresh
    - 0.15 * greatest(0, coalesce(ps, 0) - 0.7) / 0.3
    - 0.12 * stretch
    -- with no resume embedding, liked jobs and directions carry the ranking
    + case when bg is null then 0.21 * coalesce(lk, 0) + 0.10 * lane else 0 end
    )::real as score,
    -- How well it fits, 0-1: weighted share of the person's own signals that the job matches.
    -- Only signals they gave count; freshness doesn't. Null when there's nothing to judge by.
    case when (case when bg is null then 0 else 0.42 end) + (case when lk is null then 0 else 0.26 end)
              + (case when cardinality((select lanes from w)) > 0 then 0.16 else 0 end)
              + (select w_comp + w_flex + w_mission from w) = 0 then null
    else greatest(0, least(1,
      ( coalesce(0.42 * bg, 0) + coalesce(0.26 * lk, 0)
      + case when cardinality((select lanes from w)) > 0 then 0.16 * lane else 0 end
      + (select w_comp from w) * coalesce(pay, 0.3) + (select w_flex from w) * flex + (select w_mission from w) * mission )
      / ( (case when bg is null then 0 else 0.42 end) + (case when lk is null then 0 else 0.26 end)
        + (case when cardinality((select lanes from w)) > 0 then 0.16 else 0 end) + (select w_comp + w_flex + w_mission from w) )
      - 0.15 * stretch - 0.2 * greatest(0, coalesce(ps, 0) - 0.7) / 0.3
    )) end::real as fit
  from ranked r
)
select s.id, s.score, s.fit,
  array_remove(array[
    case when bg >= 0.85 then 'Close to your background' end,
    case when lk >= 0.85 then 'Like roles you liked' end,
    case when lane >= 0.65 then 'In your direction: ' || role_family end,
    case when (select w_comp from w) > 0 and pay >= 0.75 then 'Pays more than most' end,
    case when (select w_flex from w) > 0 and mode in ('remote', 'hybrid') then initcap(mode) end,
    case when (select w_mission from w) > 0 and mission = 1 then 'Mission-driven industry' end,
    case when stretch = 1 then 'Asks for more experience than you have' end
  ], null) as reasons,
  count(*) over () as total
from scored s
order by coalesce(s.fit, -1) desc, s.score desc, s.first_seen_at desc, s.id desc
limit greatest(1, least(p_limit, 50)) offset greatest(0, p_offset);
$$;

revoke all on function match_jobs(text, text[], text[], text[], text[], boolean, int, int) from public, anon;
grant execute on function match_jobs(text, text[], text[], text[], text[], boolean, int, int) to authenticated;
