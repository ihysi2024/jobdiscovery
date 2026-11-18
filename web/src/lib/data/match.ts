// "Best match" for the signed-in person: the database ranks jobs with
// match_jobs() (supabase/migrations/0006_matching.sql), acting as that person,
// then we load those jobs' details in the ranked order.
import { supabaseServer } from "../supabase/server";
import { AUTH_ENABLED } from "../supabase/env";
import { searchJobs } from "./supabase";
import type { JobPage, JobQuery } from "../types";

const cleanQuery = (q: string) => q.replace(/[,()*%\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/** Turn ranking reasons into the one-line "why you might be interested". */
export function whyLine(reasons: string[]): string {
  const good = reasons.filter((r) => !r.startsWith("Asks for more"));
  const stretch = reasons.find((r) => r.startsWith("Asks for more"));
  const line = good.slice(0, 3).join(" · ");
  return stretch ? (line ? line + " · " : "") + "A stretch: " + stretch.toLowerCase() : line;
}

export async function matchJobs(q: JobQuery): Promise<JobPage | null> {
  if (!AUTH_ENABLED) return null;
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const size = Math.min(Math.max(q.pageSize ?? 20, 1), 50);
  const page = Math.max(q.page ?? 0, 0);
  const text = cleanQuery(q.q ?? "");
  const { data, error } = await sb.rpc("match_jobs", {
    p_q: text || null,
    p_role: q.role?.length ? q.role : null,
    p_ind: q.ind?.length ? q.ind : null,
    p_mode: q.mode?.length ? q.mode : null,
    p_lvl: q.lvl?.length ? q.lvl : null,
    p_process: !!q.process,
    p_limit: size,
    p_offset: page * size,
  });
  if (error) throw new Error("Couldn't rank jobs: " + error.message);
  const ranked = (data ?? []) as { id: number; score: number; fit: number | null; reasons: string[]; total: number }[];
  // Reuse the regular search for job details and filter counts, then keep the ranked order.
  const ids = ranked.map((r) => String(r.id));
  const details = ids.length ? await searchJobs({ ids, pageSize: ids.length }) : await searchJobs({ pageSize: 1 });
  const byId = new Map(details.jobs.map((j) => [j.id, j]));
  const jobs = ranked
    .map((r) => {
      const j = byId.get(String(r.id));
      return j ? { ...j, why: whyLine(r.reasons) || j.why, summary: j.why, fit: r.fit == null ? null : Math.round(r.fit * 100) } : null;
    })
    .filter((j): j is NonNullable<typeof j> => j !== null);
  return { jobs, total: ranked.length ? Number(ranked[0].total) : 0, facets: details.facets };
}
