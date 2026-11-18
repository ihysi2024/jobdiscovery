-- Filter counts that respect the other filters. The count next to each option
-- is how many jobs match the search and every other filter group if that
-- option were also picked. A group's own picks don't narrow its own counts,
-- so you can still add a second option in the same group.

create or replace function job_facet_counts(
  p_q text default null,
  p_role text[] default null,
  p_ind text[] default null,
  p_mode text[] default null,
  p_lvl text[] default null,
  p_process boolean default false,
  p_exclude bigint[] default null
) returns table (facet text, value text, n int)
language sql stable
set search_path = public
as $$
  with base as materialized (
    select s.role_family, s.industry, s.mode, s.seniority
    from jobs_search s
    where (coalesce(p_q, '') = ''
           or s.title ilike '%' || p_q || '%'
           or s.company_name ilike '%' || p_q || '%'
           or s.summary ilike '%' || p_q || '%')
      and (not coalesce(p_process, false) or s.has_process)
      and (p_exclude is null or not (s.id = any (p_exclude)))
  ), f as (
    select *,
      (coalesce(cardinality(p_role), 0) = 0 or role_family = any (p_role)) as ok_role,
      (coalesce(cardinality(p_ind), 0) = 0 or industry = any (p_ind)) as ok_ind,
      (coalesce(cardinality(p_mode), 0) = 0 or mode = any (p_mode)) as ok_mode,
      (coalesce(cardinality(p_lvl), 0) = 0 or seniority = any (p_lvl)) as ok_lvl
    from base
  )
  select 'role', role_family, count(*)::int from f where role_family is not null and ok_ind and ok_mode and ok_lvl group by role_family
  union all
  select 'ind', industry, count(*)::int from f where industry is not null and ok_role and ok_mode and ok_lvl group by industry
  union all
  select 'mode', mode, count(*)::int from f where mode is not null and ok_role and ok_ind and ok_lvl group by mode
  union all
  select 'lvl', seniority, count(*)::int from f where seniority is not null and ok_role and ok_ind and ok_mode group by seniority
$$;

revoke all on function job_facet_counts(text, text[], text[], text[], text[], boolean, bigint[]) from public;
grant execute on function job_facet_counts(text, text[], text[], text[], text[], boolean, bigint[]) to anon, authenticated;
