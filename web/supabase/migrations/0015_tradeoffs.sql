-- Clearer tradeoffs in setup: four either-or questions, each one something a
-- posting or the profile can show, and each one now changes the ranking.
--   pay_mission  higher pay | mission-driven field   -> weight on pay or mission
--   pay_flex     higher pay | remote or hybrid       -> weight on pay or flexibility
--   level        clearly qualified | stretch roles   -> how hard roles above their level are pushed down
--   field        close to my background | something new -> resume similarity vs. chosen directions
-- Answers saved by the old eight-question version still count where they can (mission).

drop function if exists match_jobs(text, text[], text[], text[], text[], boolean, int, int, bigint[]);

create or replace function match_jobs(
  p_q text default null,
  p_role text[] default null,
  p_ind text[] default null,
  p_mode text[] default null,
  p_lvl text[] default null,
  p_process boolean default false,
  p_limit int default 20,
  p_offset int default 0,
  p_ids bigint[] default null   -- explain these jobs (job page); saved or passed jobs are kept
)
returns table (id bigint, score real, fit real, reasons text[], detail jsonb, total bigint)
language sql
stable
security definer
set search_path = public, extensions
as $$
with me as (
  select auth.uid() as uid
),
prof as (
  select p.embedding, p.years_experience, p.skills, p.resume_text, p.headline, p.experience,
    -- highest finished degree: 1 high school, 2 associate, 3 bachelor's, 4 master's, 5 doctorate or
    -- professional; degrees marked expected / in progress don't count yet; null when none listed
    (select max(case
       when coalesce(e->>'dates', '') ~* '(expected|anticipated|present|current|now|ongoing|in progress)' then 0
       when e->>'degree' ~* '(ph\.?\s?d|doctor|\mm\.?d\.?\M|\mj\.?d\.?\M|pharm\.?\s?d|\md\.?v\.?m)' then 5
       when e->>'degree' ~* '(master|\mm\.?\s?s\.?\M|\mm\.?\s?a\.?\M|\mmba\M|m\.?\s?eng|\mm\.?sc|\mmph\M|\mmsw\M|\mmfa\M)' then 4
       when e->>'degree' ~* '(bachelor|\mb\.?\s?s\.?\M|\mb\.?\s?a\.?\M|b\.?\s?eng|\mb\.?sc|\mbsn\M|\mbfa\M)' then 3
       when e->>'degree' ~* 'associate' then 2
       when e->>'degree' ~* '(high school|diploma|\mged\M)' then 1
       else null end)
     from jsonb_array_elements(coalesce(p.education, '[]'::jsonb)) e) as degree,
    -- Career level on the same scale as job seniority: 0 intern, 1 entry, 2 mid, 3 senior,
    -- 4 staff/principal, 5 director, 6 executive. From years of experience and the two most
    -- recent job titles, whichever is higher; null when we know nothing.
    nullif(greatest(
      case when p.years_experience is null then -1
           when p.years_experience < 1 then 0.8 when p.years_experience < 3 then 1.5
           when p.years_experience < 6 then 2.2 when p.years_experience < 9 then 3
           when p.years_experience < 13 then 4 else 5 end,
      coalesce((
        select max(case
          when e->>'role' ~* '\m(intern|internship|co-?op|trainee|apprentice|student)\M' then -1
          when e->>'role' ~* '\m(chief|vp|vice president|head of|cto|ceo|coo|cfo)\M' then 6
          when e->>'role' ~* '\mdirector\M' then 5
          when e->>'role' ~* '\m(principal|staff|distinguished)\M' then 4
          when e->>'role' ~* '\m(senior|sr\.?|lead)\M' then 3
          when e->>'role' ~* '\mmanager\M' then 3
          when e->>'role' ~* '\m(junior|jr\.?|entry|assistant)\M' then 1
          when coalesce(e->>'role', '') = '' then -1
          else 2 end)
        from (select e from jsonb_array_elements(coalesce(p.experience, '[]'::jsonb)) with ordinality as x(e, n) where n <= 2) t
      ), -1)
    ), -1) as level
  from profiles p join me on p.user_id = me.uid
),
pref as (
  select coalesce(p.priorities, '{}') as priorities, coalesce(p.tradeoffs, '{}'::jsonb) as tradeoffs,
         coalesce(p.work_modes, '{}') as work_modes, coalesce(p.lanes, '{}') as lanes, p.min_fit
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
    coalesce((select case array_position(priorities, 'comp') when 1 then 0.12 when 2 then 0.08 when 3 then 0.05 end from pref), 0)
      + case when (select tradeoffs->>'pay_mission' from pref) = 'pay' then 0.05 else 0 end
      + case when (select tradeoffs->>'pay_flex' from pref) = 'pay' then 0.05 else 0 end as w_comp,
    coalesce((select case array_position(priorities, 'flex') when 1 then 0.10 when 2 then 0.07 when 3 then 0.04 end from pref), 0)
      + case when (select tradeoffs->>'pay_flex' from pref) = 'flex' then 0.06 else 0 end as w_flex,
    greatest(
      coalesce((select case array_position(priorities, 'mission') when 1 then 0.10 when 2 then 0.07 when 3 then 0.04 end from pref), 0),
      coalesce((select case when tradeoffs->>'mission' = 'Yes' then 0.06 when tradeoffs->>'mission' = 'Maybe' then 0.03 end from pref), 0)
    ) + case when (select tradeoffs->>'pay_mission' from pref) = 'mission' then 0.06 else 0 end as w_mission,
    -- "Stay close to my background" leans on resume similarity; "Try something new" on the directions they picked
    case (select tradeoffs->>'field' from pref) when 'close' then 0.52 when 'new' then 0.30 else 0.42 end as w_bg,
    case (select tradeoffs->>'field' from pref) when 'close' then 0.10 when 'new' then 0.26 else 0.16 end as w_lane,
    coalesce((select tradeoffs->>'level' from pref), '') as level_pref,
    coalesce((select work_modes from pref), '{}') as modes,
    coalesce((select lanes from pref), '{}') as lanes
),
cand as (
  select s.id, s.title, s.company_name, s.industry, s.role_family, s.mode, s.salary_min_annual, s.salary_max_annual, s.seniority,
         s.first_seen_at, jl.years_experience_min, jl.degree_required, s.skills,
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
    and (p_ids is not null or s.id not in (select posting_id from passed_ids))
    and (p_ids is not null or s.id not in (select posting_id from liked_ids))   -- already in My jobs
),
-- Requirements: the skills, tools and licenses each job lists, checked against the person's profile.
uw as (  -- every word in their resume, skills, headline and job titles
  select distinct w
  from prof p,
       regexp_split_to_table(lower(coalesce(p.resume_text, '') || ' ' || array_to_string(coalesce(p.skills, '{}'), ' ') || ' ' ||
                                   coalesce(p.headline, '') || ' ' || coalesce(p.experience::text, '')), '[^a-z0-9+#]+') w
  where length(w) > 1
),
us as (  -- their listed skills, as written
  select distinct lower(trim(x)) as s from prof p, unnest(coalesce(p.skills, '{}')) x
),
js as (  -- each job's listed requirements, leaving out soft skills that resumes rarely state
  select c.id, sk.n, sk.s
  from cand c
  cross join lateral jsonb_array_elements_text(case when c.skills ~ '^\s*\[' then c.skills::jsonb else '[]'::jsonb end) with ordinality as sk(s, n)
  where lower(trim(sk.s)) !~ '^(excellent |strong |effective )?(written and verbal |verbal and written )?(communication|collaboration|teamwork|team ?work|leadership|problem[- ]solving|attention to detail|detail[- ]oriented|organization(al)?|time management|interpersonal|stakeholder management|customer service|adaptability|critical thinking|multitasking|self[- ]starter|work ethic|relationship building|cross[- ]functional collaboration)( skills)?$'
),
jsw as (  -- the meaningful words of each requirement
  select js.id, js.n, w
  from js, regexp_split_to_table(lower(js.s), '[^a-z0-9+#]+') w
  where length(w) > 1
    and w not in ('experience', 'experienced', 'skills', 'skill', 'knowledge', 'strong', 'proficiency', 'proficient', 'ability',
                  'and', 'or', 'with', 'of', 'in', 'on', 'the', 'for', 'to', 'tools', 'using', 'years', 'year', 'plus', 'etc',
                  'familiarity', 'understanding', 'working', 'hands', 'advanced', 'basic', 'excellent', 'solid', 'deep')
),
jswm as (  -- does every meaningful word appear somewhere in their profile?
  select x.id, x.n, bool_and(u.w is not null) as all_words
  from jsw x left join uw u on u.w = x.w
  group by x.id, x.n
),
req as (
  select js.id,
         count(*) as n_skills,
         count(*) filter (where lower(trim(js.s)) in (select s from us) or coalesce(m.all_words, false)) as n_met,
         (array_agg(js.s order by js.n) filter (where not (lower(trim(js.s)) in (select s from us) or coalesce(m.all_words, false))))[1:3] as missing
  from js left join jswm m on m.id = js.id and m.n = js.n
  where (select count(*) from uw) > 0   -- nothing to check against without a profile
  group by js.id
),
ranked as (
  select c.*, req.n_skills, req.n_met, req.missing,
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
    -- the job's level on the same scale
    case seniority when 'intern' then 0 when 'entry' then 1 when 'mid' then 2 when 'senior' then 3
                   when 'manager' then 3.5 when 'staff_principal' then 4 when 'director' then 5 when 'executive' then 6 end as job_level,
    exp(-greatest(0, extract(epoch from (now() - first_seen_at::timestamptz)) / 86400.0) / 21.0) as fresh
  from cand c cross join w left join req on req.id = c.id
),
qual0 as (
  select r.*,
    -- 1 = within reach, lower = harder to get given their experience (1 when we can't tell)
    least(
      case when (select level from prof) is null or job_level is null then 1
           when job_level - (select level from prof) <= 0.3 then
             case when job_level - (select level from prof) < -1.5 then 0.6 else 1 end
           when job_level - (select level from prof) <= 1.0 then 0.45
           when job_level - (select level from prof) <= 1.6 then 0.25
           else 0.05 end,
      case when years_experience_min is null or (select years_experience from prof) is null then 1
           when years_experience_min - (select years_experience from prof) <= 0.5 then 1
           when years_experience_min - (select years_experience from prof) <= 2 then 0.55
           when years_experience_min - (select years_experience from prof) <= 4 then 0.25
           else 0.05 end
    ) as q_raw,
    -- years and degree as requirements too, when both sides are known
    case when years_experience_min is not null and (select years_experience from prof) is not null
         then (years_experience_min <= (select years_experience from prof) + 0.5)::int end as years_ok,
    case when (select degree from prof) is null then null
         when degree_required in ('high_school', 'associate', 'bachelors', 'masters', 'phd', 'professional')
         then ((select degree from prof) >= case degree_required when 'high_school' then 1 when 'associate' then 2 when 'bachelors' then 3
                                                                 when 'masters' then 4 else 5 end)::int end as degree_ok
  from ranked r
),
qual as (
  -- "Stretch roles a level up" lifts roles just above their level; "Roles I'm clearly
  -- qualified for" pushes them further down. Far-out-of-reach roles stay down either way.
  select q0.*,
    case when q_raw >= 1 then 1
         when (select level_pref from w) = 'stretch' and q_raw >= 0.2 then least(1, q_raw + 0.3)
         when (select level_pref from w) = 'qualified' then q_raw * 0.6
         else q_raw end as q
  from qual0 q0
),
reqs as (
  select r.*,
    coalesce(n_skills, 0) + (years_ok is not null)::int + (degree_ok is not null)::int as req_total,
    coalesce(n_met, 0) + coalesce(years_ok, 0) + coalesce(degree_ok, 0) as req_met
  from qual r
),
scored as (
  select r.*,
    ( (select w_bg from w) * coalesce(bg, 0) * (case when bg is null then 0 else 1 end)
    + 0.26 * coalesce(lk, 0)
    + (select w_lane from w) * lane
    + (select w_comp from w) * coalesce(pay, 0.3)
    + (select w_flex from w) * flex
    + (select w_mission from w) * mission
    + 0.05 * fresh
    - 0.15 * greatest(0, coalesce(ps, 0) - 0.7) / 0.3
    - case (select level_pref from w) when 'stretch' then 0.04 when 'qualified' then 0.2 else 0.12 end * stretch
    -- with no resume embedding, liked jobs and directions carry the ranking
    + case when bg is null then 0.21 * coalesce(lk, 0) + 0.10 * lane else 0 end
    )::real * (0.15 + 0.85 * q) * (case when req_total > 0 then 0.35 + 0.65 * req_met::real / req_total else 1 end) as score,
    -- How well it fits, 0-1. Two halves: how many of the job's listed requirements they meet,
    -- and how well it matches what they want (resume closeness, likes, directions, measurable
    -- priorities). Then scaled by how reachable the level is. Only signals they gave count;
    -- null when there's nothing to judge by.
    case when interest is null and req_total = 0 then null
    else greatest(0, least(1,
      case when req_total = 0 then interest
           when interest is null then req_met::real / req_total
           else 0.55 * req_met::real / req_total + 0.45 * interest end
      - 0.2 * greatest(0, coalesce(ps, 0) - 0.7) / 0.3
    )) * (0.15 + 0.85 * q) end::real as fit
  from (
    select r.*,
      case when (case when bg is null then 0 else (select w_bg from w) end) + (case when lk is null then 0 else 0.26 end)
                + (case when cardinality((select lanes from w)) > 0 then (select w_lane from w) else 0 end)
                + (select w_comp + w_flex + w_mission from w) = 0 then null
      else ( coalesce((select w_bg from w) * bg, 0) + coalesce(0.26 * lk, 0)
           + case when cardinality((select lanes from w)) > 0 then (select w_lane from w) * lane else 0 end
           + (select w_comp from w) * coalesce(pay, 0.3) + (select w_flex from w) * flex + (select w_mission from w) * mission )
         / ( (case when bg is null then 0 else (select w_bg from w) end) + (case when lk is null then 0 else 0.26 end)
           + (case when cardinality((select lanes from w)) > 0 then (select w_lane from w) else 0 end) + (select w_comp + w_flex + w_mission from w) )
      end as interest
    from reqs r
  ) r
)
select s.id, s.score, s.fit,
  array_remove(array[
    case when bg >= 0.85 then 'Close to your background' end,
    case when lk >= 0.85 then 'Like roles you liked' end,
    case when lane >= 0.65 then 'In your direction: ' || role_family end,
    case when (select w_comp from w) > 0 and pay >= 0.75 then 'Pays more than most' end,
    case when (select w_flex from w) > 0 and mode in ('remote', 'hybrid') then initcap(mode) end,
    case when (select w_mission from w) > 0 and mission = 1 then 'Mission-driven industry' end,
    case when req_total >= 3 and req_met = req_total then 'Meets all ' || req_total || ' listed requirements'
         when req_total >= 3 and req_met::real / req_total >= 0.7 then 'Meets ' || req_met || ' of ' || req_total || ' listed requirements' end,
    case when q >= 1 and job_level is not null and (select level from prof) is not null then 'Right level for your experience' end,
    case when req_total >= 3 and req_met::real / req_total < 0.5 then 'Missing requirements: ' || array_to_string(missing, ', ') end,
    case when q < 0.3 then 'Likely out of reach: ' || case when years_experience_min is not null and years_experience_min - (select years_experience from prof) > 2
                                                         then 'asks for ' || years_experience_min::int || '+ years'
                                                         else replace(seniority, 'staff_principal', 'staff') || '-level role' end
         when q < 0.9 then 'A stretch: ' || case when years_experience_min is not null and years_experience_min - (select years_experience from prof) > 0.5
                                                 then 'asks for ' || years_experience_min::int || '+ years'
                                                 else replace(seniority, 'staff_principal', 'staff') || ' role' end end
  ], null) as reasons,
  jsonb_build_object(
    'bg', round(bg::numeric, 2), 'liked', round(lk::numeric, 2), 'lane', array_position((select lanes from w), role_family),
    'direction', role_family, 'industry', industry, 'mode', mode, 'pay', round(pay::numeric, 2),
    'salary_min', salary_min_annual, 'salary_max', salary_max_annual, 'mission', mission = 1,
    'wants_pay', (select w_comp from w) > 0, 'wants_flex', (select w_flex from w) > 0, 'wants_mission', (select w_mission from w) > 0,
    'modes', (select modes from w), 'q', round(q::numeric, 2), 'job_level', job_level, 'level', (select level from prof),
    'years_min', years_experience_min, 'years', (select years_experience from prof),
    'req_total', req_total, 'req_met', req_met, 'missing', to_jsonb(coalesce(missing, '{}')),
    'years_ok', years_ok, 'degree_ok', degree_ok, 'degree_required', degree_required
  ) as detail,
  count(*) over () as total
from scored s
where (p_ids is null or s.id = any(p_ids))
  -- their minimum match; jobs with no percentage (nothing to judge by) stay visible
  and (p_ids is not null or s.fit is null or (select min_fit from pref) is null or s.fit * 100 >= (select min_fit from pref))
order by coalesce(s.fit, -1) desc, s.score desc, s.first_seen_at desc, s.id desc
limit greatest(1, least(p_limit, 50)) offset greatest(0, p_offset);
$$;

revoke all on function match_jobs(text, text[], text[], text[], text[], boolean, int, int, bigint[]) from public, anon;
grant execute on function match_jobs(text, text[], text[], text[], text[], boolean, int, int, bigint[]) to authenticated;
