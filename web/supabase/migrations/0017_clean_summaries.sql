-- The labeling model sometimes padded summaries with "null, null, null...".
-- It now strips that (classify.clean_summary); clean the summaries already saved.
update job_features
set summary = nullif(
  case when s2 ~ '[.!?…]$' or s2 = '' then s2 else s2 || '.' end, '')
from (
  select posting_id as pid,
         btrim(regexp_replace(
           regexp_replace(summary, '[\s,;:.]*\mnull\M([\s,;:.]*\mnull\M)+[\s,;:.]*', '', 'gi'),
           '[\s,;:]+\mnull\M[\s,;:.]*$', '', 'i'), E' ,;:\n') as s2
  from job_features
  where summary ~* '\mnull\M'
) x
where posting_id = x.pid
  and (summary ~* '\mnull\M([\s,;:.]*\mnull\M)+' or summary ~* '[\s,;:]+\mnull\M[\s,;:.]*$');
